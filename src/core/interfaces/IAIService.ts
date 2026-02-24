import { ChatMessage } from './IContextManager';

export interface IAIService {
    /**
     * Gera uma resposta de texto baseada no prompt e contexto fornecidos.
     * @param prompt O texto de entrada do usuário.
     * @param context Histórico opcional de mensagens anteriores para contexto.
     * @returns A resposta gerada pela IA.
     */
    generateResponse(prompt: string, context?: ChatMessage[]): Promise<string>;

    /**
     * Transcreve áudio para texto.
     * @param audioBuffer O buffer do arquivo de áudio.
     * @returns O texto transcrito.
     */
    transcribeAudio(audioBuffer: Buffer): Promise<string>;

    /**
     * Converte texto em áudio (TTS).
     * @param text O texto a ser falado.
     * @returns O buffer do arquivo de áudio gerado.
     */
    generateAudio(text: string): Promise<Buffer>;
}
