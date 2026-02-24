import OpenAI from 'openai';
import { config } from '../../config/env';
import { IAIService } from '../../core/interfaces/IAIService';
import { logger } from '../../utils/logger';

/**
 * Implementação do serviço de IA utilizando a OpenAI (GPT).
 */
export class OpenAIService implements IAIService {
    private openai: OpenAI;
    private model: string;

    constructor() {
        if (!config.openaiApiKey) {
            logger.warn('OPENAI_API_KEY não configurada. O serviço de IA pode falhar.');
        }
        this.openai = new OpenAI({ apiKey: config.openaiApiKey });
        this.model = 'gpt-4-turbo-preview'; // Pode ser movido para config
    }

    /**
     * Gera resposta utilizando o modelo GPT da OpenAI.
     */
    async generateResponse(prompt: string, context: string[] = []): Promise<string> {
        try {
            // Constrói o array de mensagens com sistema, contexto e prompt atual
            const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
                { 
                    role: 'system', 
                    content: 'Você é OpenClaw, um assistente virtual avançado, autônomo e eficiente. Responda de forma direta e útil.' 
                },
                // Mapeia contexto simples para mensagens de usuário (pode ser melhorado para role user/assistant)
                ...context.map(msg => ({ role: 'user', content: msg } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
                { role: 'user', content: prompt }
            ];

            const completion = await this.openai.chat.completions.create({
                messages,
                model: this.model,
                temperature: 0.7,
            });

            return completion.choices[0]?.message?.content || 'Não foi possível gerar uma resposta.';
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
