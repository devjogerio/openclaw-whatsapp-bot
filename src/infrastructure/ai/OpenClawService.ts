
import axios, { AxiosInstance, AxiosError } from 'axios';
import { IAIService } from '../../core/interfaces/IAIService';
import { ICacheService } from '../../core/interfaces/ICacheService';
import { ChatMessage } from '../../core/interfaces/IContextManager';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { SkillRegistry } from '../../core/services/SkillRegistry';
import { MemoryCacheService } from '../cache/MemoryCacheService';
import * as crypto from 'crypto';

/**
 * Serviço de integração com a API OpenClaw.
 * Implementa retry logic, caching (Redis/Memory) e streaming.
 */
export class OpenClawService implements IAIService {
    private client: AxiosInstance;
    private skillRegistry?: SkillRegistry;
    private cache: ICacheService;

    constructor(skillRegistry?: SkillRegistry, cacheService?: ICacheService) {
        this.skillRegistry = skillRegistry;
        this.cache = cacheService || new MemoryCacheService();
        this.client = axios.create({
            baseURL: config.openclawBaseUrl,
            headers: {
                'Authorization': `Bearer ${config.openclawApiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 60000, // 60s timeout (aumentado para streaming/modelos lentos)
        });

        // Interceptor para logs e métricas básicas
        this.client.interceptors.request.use(req => {
            logger.debug(`[OpenClaw] Request: ${req.method?.toUpperCase()} ${req.url}`);
            return req;
        });
    }

    /**
     * Gera uma resposta de texto baseada no prompt e contexto.
     * Suporta caching e retry automático.
     */
    async generateResponse(prompt: string, context: ChatMessage[] = [], imageUrl?: string): Promise<string> {
        const start = Date.now();
        const cacheKey = this.generateCacheKey(prompt, context, imageUrl);
        
        // Verifica cache
        const cached = await this.cache.get<string>(cacheKey);
        if (cached) {
            logger.info('[OpenClaw] Cache hit para prompt.');
            return cached;
        }

        try {
            return await this.executeWithRetry(async () => {
                const messages = this.formatMessages(prompt, context, imageUrl);
                const tools = this.getToolsDefinition();
                
                const response = await this.client.post('/chat/completions', {
                    model: config.openclawModel,
                    messages,
                    tools: tools.length > 0 ? tools : undefined,
                    temperature: 0.7,
                });

                const choice = response.data.choices[0];
                const message = choice.message;
                const outputContent = message.content || '';

                // Tratamento de Tool Calls (Function Calling)
                if (message.tool_calls && message.tool_calls.length > 0) {
                    return await this.handleToolCalls(messages, message, message.tool_calls);
                }
                
                // Salva no cache se não for tool call
                if (outputContent) {
                    await this.cache.set(cacheKey, outputContent, config.cacheTtl);
                }

                return outputContent;
            });

        } catch (error) {
            throw error;
        }
    }

    /**
     * Gera uma resposta em stream.
     * Retorna um AsyncGenerator que yielda chunks de texto.
     */
    async *generateResponseStream(prompt: string, context: ChatMessage[] = [], imageUrl?: string): AsyncGenerator<string, void, unknown> {
        const start = Date.now();
        const messages = this.formatMessages(prompt, context, imageUrl);
        const tools = this.getToolsDefinition(); // Nota: Streaming com tools é complexo, simplificando para texto por enquanto

        try {
            const response = await this.client.post('/chat/completions', {
                model: config.openclawModel,
                messages,
                tools: tools.length > 0 ? tools : undefined,
                temperature: 0.7,
                stream: true,
            }, {
                responseType: 'stream'
            });

            const stream = response.data;
            let buffer = '';

            for await (const chunk of stream) {
                const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');
                for (const line of lines) {
                    const message = line.replace(/^data: /, '');
                    if (message === '[DONE]') return;
                    
                    try {
                        const parsed = JSON.parse(message);
                        const content = parsed.choices[0]?.delta?.content || '';
                        if (content) {
                            buffer += content;
                            yield content;
                        }
                    } catch (error) {
                        // Ignora erros de parse em chunks parciais
                    }
                }
            }
            
        } catch (error) {
            logger.error(`[OpenClaw] Erro no streaming: ${error}`);
            throw error;
        }
    }

    /**
     * Transcreve áudio para texto (STT).
     */
    async transcribeAudio(audioBuffer: Buffer): Promise<string> {
        return this.executeWithRetry(async () => {
            // Mock implementation as form-data is not available/configured yet
            logger.warn('[OpenClaw] Transcrição via multipart requer pacote form-data. Retornando stub.');
            return "Transcrição simulada: Áudio recebido com sucesso."; 
        });
    }

    /**
     * Converte texto em áudio (TTS).
     */
    async generateAudio(text: string): Promise<Buffer> {
        return this.executeWithRetry(async () => {
            const response = await this.client.post('/audio/speech', {
                model: 'openclaw-tts-1',
                input: text,
                voice: 'alloy',
            }, {
                responseType: 'arraybuffer'
            });

            return Buffer.from(response.data);
        });
    }

    // --- Helpers Privados ---

    private async executeWithRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
        let lastError: any;
        for (let i = 0; i < retries; i++) {
            try {
                return await operation();
            } catch (error: any) {
                lastError = error;
                const status = error.response?.status;
                
                // Não retenta erros de cliente (4xx), exceto 429 (Rate Limit)
                if (status && status >= 400 && status < 500 && status !== 429) {
                    throw error;
                }

                logger.warn(`[OpenClaw] Erro na tentativa ${i + 1}/${retries}: ${error.message}`);
                await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i))); // Backoff exponencial
            }
        }
        logger.error(`[OpenClaw] Falha após ${retries} tentativas.`);
        throw lastError;
    }

    private formatMessages(prompt: string, context: ChatMessage[], imageUrl?: string): any[] {
        const messages: any[] = [
            { role: 'system', content: 'Você é o OpenClaw, um assistente inteligente integrado ao WhatsApp.' },
            ...context.map(msg => ({ role: msg.role, content: msg.content, name: msg.name })),
            { role: 'user', content: prompt }
        ];

        if (imageUrl) {
            const lastMsg = messages[messages.length - 1];
            lastMsg.content = [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } }
            ];
        }

        return messages;
    }

    private getToolsDefinition(): any[] {
        if (!this.skillRegistry) return [];
        return this.skillRegistry.getToolsDefinition().map(tool => ({
            type: 'function',
            function: {
                name: tool.function.name,
                description: tool.function.description,
                parameters: tool.function.parameters
            }
        }));
    }

    private async handleToolCalls(messages: any[], assistantMessage: any, toolCalls: any[]): Promise<string> {
        messages.push(assistantMessage);

        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            
            logger.info(`[OpenClaw] Executando tool: ${functionName}`);
            
            let result = 'Erro: Ferramenta não encontrada';
            if (this.skillRegistry) {
                try {
                    const args = JSON.parse(toolCall.function.arguments);
                    const skill = this.skillRegistry.get(functionName);
                    if (skill) {
                        result = JSON.stringify(await skill.execute(args));
                    }
                } catch (e: any) {
                    result = `Erro na execução: ${e.message}`;
                }
            }

            messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: functionName,
                content: result
            });
        }

        const response = await this.client.post('/chat/completions', {
            model: config.openclawModel,
            messages
        });

        return response.data.choices[0].message.content;
    }

    private generateCacheKey(prompt: string, context: ChatMessage[], imageUrl?: string): string {
        const data = JSON.stringify({ prompt, context: context.length, lastMsg: context[context.length - 1], imageUrl });
        return crypto.createHash('md5').update(data).digest('hex');
    }

    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }
}
