import { Ollama } from 'ollama';
import { config } from '../../config/env';
import { ChatMessage } from '../../core/interfaces/IContextManager';
import { IAIService } from '../../core/interfaces/IAIService';
import { logger } from '../../utils/logger';
import { SkillRegistry } from '../../core/services/SkillRegistry';

/**
 * Implementação do serviço de IA utilizando Ollama.
 */
export class OllamaService implements IAIService {
    private ollama: Ollama;
    private model: string;
    private skillRegistry?: SkillRegistry;

    constructor(skillRegistry?: SkillRegistry) {
        this.ollama = new Ollama({ host: config.ollamaHost });
        this.model = config.ollamaModel;
        this.skillRegistry = skillRegistry;
        logger.info(`OllamaService iniciado. Host: ${config.ollamaHost}, Model: ${this.model}`);
    }

    /**
     * Gera resposta utilizando o modelo local via Ollama.
     */
    async generateResponse(prompt: string, context: ChatMessage[] = [], imageUrl?: string): Promise<string> {
        try {
            const messages = [
                {
                    role: 'system',
                    content: 'Você é OpenClaw, um assistente virtual avançado, autônomo e eficiente. Responda de forma direta e útil. Use as ferramentas disponíveis quando necessário.'
                },
                ...context.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                {
                    role: 'user',
                    content: prompt,
                    images: imageUrl ? [this.extractBase64(imageUrl)] : undefined
                }
            ];

            const tools = this.skillRegistry?.getToolsDefinition().map(tool => ({
                type: 'function',
                function: {
                    name: tool.function.name,
                    description: tool.function.description,
                    parameters: tool.function.parameters
                }
            }));

            // Primeira chamada ao modelo
            let response = await this.ollama.chat({
                model: this.model,
                messages: messages as any[], // Casting para any[] devido a incompatibilidade de tipos na lib ollama
                tools: tools && tools.length > 0 ? tools : undefined,
                stream: false
            });

            // Verifica se o modelo quer chamar ferramentas
            if (response.message.tool_calls && response.message.tool_calls.length > 0) {
                // Adiciona a resposta do assistente ao histórico
                messages.push(response.message as any);

                for (const toolCall of response.message.tool_calls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = toolCall.function.arguments;

                    logger.info(`[Ollama] Executando skill: ${functionName}`);
                    
                    const skill = this.skillRegistry?.get(functionName);
                    let functionResponse = 'Erro: Skill não encontrada.';

                    if (skill) {
                        try {
                            const result = await skill.execute(functionArgs);
                            functionResponse = JSON.stringify(result);
                        } catch (error: any) {
                            functionResponse = `Erro ao executar skill: ${error.message}`;
                        }
                    }

                    // Adiciona o resultado da ferramenta ao histórico
                    messages.push({
                        role: 'tool',
                        content: functionResponse,
                    } as any);
                }

                // Segunda chamada ao modelo com os resultados
                const secondResponse = await this.ollama.chat({
                    model: this.model,
                    messages: messages as any[],
                    stream: false
                });

                return secondResponse.message.content;
            }

            return response.message.content;
        } catch (error) {
            logger.error(error, 'Erro ao gerar resposta com Ollama');
            return 'Desculpe, ocorreu um erro ao processar sua solicitação com o modelo local.';
        }
    }

    /**
     * Transcreve áudio (Ollama ainda não suporta nativamente Whisper via API padrão em todos os casos, 
     * mas podemos manter a interface ou usar um serviço externo/local se disponível).
     * Por enquanto, retornaremos erro ou vazio se não houver endpoint compatível.
     */
    async transcribeAudio(audioBuffer: Buffer): Promise<string> {
        logger.warn('[Ollama] Transcrição de áudio não implementada nativamente neste adaptador.');
        return 'Desculpe, a transcrição de áudio não está disponível no modo local ainda.';
    }

    /**
     * Gera áudio (TTS).
     * Ollama é focado em texto. Retornaremos erro.
     */
    async generateAudio(text: string): Promise<Buffer> {
        logger.warn('[Ollama] TTS não implementado nativamente neste adaptador.');
        throw new Error('TTS não suportado pelo OllamaService.');
    }

    private extractBase64(dataUri: string): string {
        return dataUri.split(',')[1] || dataUri;
    }
}
