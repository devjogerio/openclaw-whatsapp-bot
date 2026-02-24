import { ISkill } from '../interfaces/ISkill';
import { logger } from '../../utils/logger';

/**
 * Registro central de todas as skills disponíveis.
 */
export class SkillRegistry {
    private skills: Map<string, ISkill> = new Map();

    /**
     * Registra uma nova skill no sistema.
     */
    register(skill: ISkill): void {
        if (this.skills.has(skill.name)) {
            logger.warn(`Skill ${skill.name} já registrada. Sobrescrevendo...`);
        }
        this.skills.set(skill.name, skill);
        logger.info(`Skill registrada: ${skill.name}`);
    }

    /**
     * Recupera uma skill pelo nome.
     */
    get(name: string): ISkill | undefined {
        return this.skills.get(name);
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
