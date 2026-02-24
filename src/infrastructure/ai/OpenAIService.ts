import OpenAI from 'openai';
import { config } from '../../config/env';
import { IAIService } from '../../core/interfaces/IAIService';
import { logger } from '../../utils/logger';
import { SkillRegistry } from '../../core/services/SkillRegistry';

/**
 * Implementação do serviço de IA utilizando a OpenAI (GPT).
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
        this.model = 'gpt-4-turbo-preview';
        this.skillRegistry = skillRegistry;
    }

    /**
     * Gera resposta utilizando o modelo GPT da OpenAI.
     */
    async generateResponse(prompt: string, context: string[] = []): Promise<string> {
        try {
            const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
                { 
                    role: 'system', 
                    content: 'Você é OpenClaw, um assistente virtual avançado, autônomo e eficiente. Responda de forma direta e útil. Use as ferramentas disponíveis quando necessário.' 
                },
                ...context.map(msg => ({ role: 'user', content: msg } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
                { role: 'user', content: prompt }
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
     * Transcreve áudio usando Whisper (Placeholder).
     */
    async transcribeAudio(audioBuffer: Buffer): Promise<string> {
        // TODO: Implementar transcrição com Whisper API
        logger.warn('Transchição de áudio ainda não implementada.');
        return '';
    }
}
