export interface IAIService {
    /**
     * Gera uma resposta de texto baseada no prompt e contexto fornecidos.
     * @param prompt O texto de entrada do usuário.
     * @param context Histórico opcional de mensagens anteriores para contexto.
     * @returns A resposta gerada pela IA.
     */
    generateResponse(prompt: string, context?: string[]): Promise<string>;

    /**
     * Transcreve áudio para texto.
     * @param audioBuffer O buffer do arquivo de áudio.
     * @returns O texto transcrito.
     */
    transcribeAudio(audioBuffer: Buffer): Promise<string>;
}
