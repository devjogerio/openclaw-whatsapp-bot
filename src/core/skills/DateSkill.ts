import { ISkill } from '../interfaces/ISkill';

export class DateSkill implements ISkill {
    name = 'get_current_date';
    description = 'Retorna a data e hora atuais. Use quando o usuário perguntar "que dia é hoje" ou precisar de contexto temporal.';
    
    parameters = {
        type: 'object',
        properties: {
            format: {
                type: 'string',
                description: 'O formato desejado para a data (ex: "ISO", "locale"). Opcional.',
                enum: ['ISO', 'locale']
            }
        },
        required: []
    };

    async execute(params: { format?: string }): Promise<string> {
        const now = new Date();
        if (params.format === 'ISO') {
            return now.toISOString();
        }
        return now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }
}
