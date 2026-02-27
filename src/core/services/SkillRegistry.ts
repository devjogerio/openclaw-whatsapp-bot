import { ISkill } from '../interfaces/ISkill';
import { logger } from '../../utils/logger';

/**
 * Registro central de todas as skills disponíveis.
 */
export class SkillRegistry {
    private skills: Map<string, ISkill> = new Map();

    /**
     * Registra uma nova skill no sistema.
     * Valida a estrutura da skill antes de registrar.
     */
    register(skill: ISkill): void {
        this.validateSkill(skill);

        if (this.skills.has(skill.name)) {
            logger.warn(`[SkillRegistry] Skill ${skill.name} já registrada. Sobrescrevendo...`);
        }
        this.skills.set(skill.name, skill);
        logger.info(`[SkillRegistry] Skill registrada: ${skill.name}`);
    }

    /**
     * Registra múltiplas skills de uma vez.
     */
    registerAll(skills: ISkill[]): void {
        skills.forEach(skill => this.register(skill));
    }

    /**
     * Recupera uma skill pelo nome.
     */
    get(name: string): ISkill | undefined {
        return this.skills.get(name);
    }

    /**
     * Retorna todas as skills registradas.
     */
    getAll(): ISkill[] {
        return Array.from(this.skills.values());
    }

    /**
     * Valida se a skill possui os campos obrigatórios.
     */
    private validateSkill(skill: ISkill): void {
        if (!skill.name || typeof skill.name !== 'string') {
            throw new Error('Skill inválida: Nome obrigatório e deve ser string.');
        }
        if (!skill.description || typeof skill.description !== 'string') {
            throw new Error(`Skill "${skill.name}" inválida: Descrição obrigatória.`);
        }
        if (!skill.parameters || typeof skill.parameters !== 'object') {
            throw new Error(`Skill "${skill.name}" inválida: Parâmetros obrigatórios (JSON Schema).`);
        }
        if (!skill.execute || typeof skill.execute !== 'function') {
            throw new Error(`Skill "${skill.name}" inválida: Método execute obrigatório.`);
        }
    }

    /**
     * Retorna todas as definições de skills no formato esperado pela OpenAI (tools).
     */
    getToolsDefinition(): any[] {
        return Array.from(this.skills.values()).map(skill => ({
            type: 'function',
            function: {
                name: skill.name,
                description: skill.description,
                parameters: skill.parameters
            }
        }));
    }
}
