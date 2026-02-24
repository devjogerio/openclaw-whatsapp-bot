/**
 * Representa a definição de uma Skill (Habilidade) que pode ser invocada pela IA.
 */
export interface ISkill {
    /** Nome único da skill (ex: "send_email", "search_web") */
    name: string;
    
    /** Descrição clara do que a skill faz para a IA entender quando usar */
    description: string;
    
    /** Schema JSON dos parâmetros esperados (formato OpenAI Tools/Function Calling) */
    parameters: Record<string, any>;
    
    /** Função executada quando a skill é chamada */
    execute(params: any): Promise<any>;
}
