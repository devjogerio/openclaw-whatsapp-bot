import OpenAI, { toFile } from 'openai';
import { config } from '../../config/env';
import { ChatMessage } from '../../core/interfaces/IContextManager';
import { IAIService } from '../../core/interfaces/IAIService';
import { logger } from '../../utils/logger';
import { SkillRegistry } from '../../core/services/SkillRegistry';

/**
 * Implementação do serviço de IA utilizando a OpenAI (GPT, Whisper, TTS).
 */
export class OpenAIService implements IAIService {
    private openai: OpenAI;
    private model: string;
    private skillRegistry?: SkillRegistry;

    constructor(skillRegistry?: SkillRegistry) {
        if (!config.openaiApiKey) {
            logger.warn('OPENAI_API_KEY não configurada. O serviço de IA pode falhar.');
        }
        this.openai = new OpenAI({ apiKey: config.openaiApiKey });
        this.model = 'gpt-4o'; // Usando GPT-4o para melhor performance e suporte a visão
        this.skillRegistry = skillRegistry;
    }

    /**
     * Gera resposta utilizando o modelo GPT da OpenAI.
     */
    async generateResponse(prompt: string, context: ChatMessage[] = [], imageUrl?: string): Promise<string> {
        try {
            // Constrói a mensagem do usuário
            let userMessageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] | string = prompt;

            if (imageUrl) {
                userMessageContent = [
                    { type: 'text', text: prompt },
                    {
                        type: 'image_url',
                        image_url: {
                            url: imageUrl, // Deve ser uma URL pública ou base64 data URI (data:image/jpeg;base64,...)
                        },
                    },
                ];
            }

            const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
                { 
                    role: 'system', 
                    content: 'Você é OpenClaw, um assistente virtual avançado, autônomo e eficiente. Responda de forma direta e útil. Use as ferramentas disponíveis quando necessário. Para imagens, descreva o que vê e responda à pergunta do usuário.' 
                },
                ...context.map(msg => ({
                    role: msg.role as 'system' | 'user' | 'assistant' | 'function',
                    content: msg.content,
                    name: msg.name
                } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
                { 
                    role: 'user', 
                    content: userMessageContent as any 
                }
            ];

            const tools = this.skillRegistry?.getToolsDefinition();
            
            // Primeira chamada à API
            const completion = await this.openai.chat.completions.create({
                messages,
                model: this.model,
                temperature: 0.7,
                tools: tools && tools.length > 0 ? tools : undefined,
                tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
            });

            const message = completion.choices[0]?.message;

            // Se a IA decidir chamar ferramentas
            if (message?.tool_calls && message.tool_calls.length > 0) {
                // Adiciona a mensagem da IA com tool_calls ao histórico
                messages.push(message);

                for (const toolCall of message.tool_calls) {
                    if (toolCall.type !== 'function') continue;

                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);

                    logger.info(`[AI] Executando skill: ${functionName}`);
                    
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
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        content: functionResponse,
                    });
                }

                // Segunda chamada à API com os resultados das ferramentas
                const secondCompletion = await this.openai.chat.completions.create({
                    messages,
                    model: this.model,
                });

                return secondCompletion.choices[0]?.message?.content || 'Não foi possível gerar uma resposta após execução da ferramenta.';
            }

            return message?.content || 'Não foi possível gerar uma resposta.';
        } catch (error) {
            logger.error(error, 'Erro ao gerar resposta com OpenAI');
            return 'Desculpe, ocorreu um erro ao processar sua solicitação.';
        }
    }

    /**
     * Transcreve áudio usando Whisper.
     */
    async transcribeAudio(audioBuffer: Buffer): Promise<string> {
        try {
            logger.info('[AI] Transcrevendo áudio...');
            const file = await toFile(audioBuffer, 'audio.ogg', { type: 'audio/ogg' });
            
            const transcription = await this.openai.audio.transcriptions.create({
                file: file,
                model: 'whisper-1',
                language: 'pt', // Pode ser detectado automaticamente, mas fixar 'pt' ajuda na precisão
            });

            logger.info(`[AI] Transcrição: "${transcription.text}"`);
            return transcription.text;
        } catch (error) {
            logger.error(error, 'Erro ao transcrever áudio');
            return ''; // Retorna string vazia em caso de erro
        }
    }

    /**
     * Gera áudio (TTS) a partir de texto.
     */
    async generateAudio(text: string): Promise<Buffer> {
        try {
            logger.info('[AI] Gerando áudio TTS...');
            const mp3 = await this.openai.audio.speech.create({
                model: 'tts-1',
                voice: 'alloy',
                input: text,
            });
            
            const buffer = Buffer.from(await mp3.arrayBuffer());
            return buffer;
        } catch (error) {
            logger.error(error, 'Erro ao gerar áudio TTS');
            throw error;
        }
    }
}
