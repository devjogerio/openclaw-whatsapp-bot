import { ISkill } from '../interfaces/ISkill';

interface DateParams {
    action?: 'current_date' | 'convert_timezone' | 'list_timezones';
    timezone?: string;
    format?: 'ISO' | 'locale' | 'full' | 'time_only' | 'date_only';
    base_date?: string; // Para conversões futuras
}

export class DateSkill implements ISkill {
    name = 'date_tool';
    description = 'Ferramenta versátil para obter data/hora atual em diferentes fusos horários, converter datas e listar fusos disponíveis. Use para responder perguntas sobre "que dia é hoje", "que horas são em Londres", etc.';
    
    parameters = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                description: 'A ação a ser realizada. Padrão: "current_date".',
                enum: ['current_date', 'convert_timezone', 'list_timezones']
            },
            timezone: {
                type: 'string',
                description: 'O fuso horário desejado (ex: "America/Sao_Paulo", "UTC", "Asia/Tokyo"). Padrão: "America/Sao_Paulo".'
            },
            format: {
                type: 'string',
                description: 'O formato de saída desejado.',
                enum: ['ISO', 'locale', 'full', 'time_only', 'date_only']
            },
            base_date: {
                type: 'string',
                description: 'Data base para conversão (ISO string). Se omitido, usa o momento atual.'
            }
        },
        required: []
    };

    async execute(params: DateParams): Promise<string> {
        const action = params.action || 'current_date';
        const timezone = params.timezone || 'America/Sao_Paulo';
        const format = params.format || 'locale';
        
        try {
            switch (action) {
                case 'current_date':
                case 'convert_timezone':
                    return this.handleDate(timezone, format, params.base_date);
                case 'list_timezones':
                    return this.listCommonTimezones();
                default:
                    return `Ação desconhecida: ${action}. Use 'current_date', 'convert_timezone' ou 'list_timezones'.`;
            }
        } catch (error: any) {
            return `Erro ao executar DateSkill: ${error.message}. Verifique se o fuso horário "${timezone}" é válido.`;
        }
    }

    private handleDate(timezone: string, format: string, baseDateStr?: string): string {
        let date = baseDateStr ? new Date(baseDateStr) : new Date();
        
        if (baseDateStr && isNaN(date.getTime())) {
            throw new Error('Data base inválida. Use formato ISO (ex: 2023-12-25T10:00:00Z).');
        }

        // Validação básica de timezone
        try {
            new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(date);
        } catch (e) {
            throw new Error(`Fuso horário inválido: ${timezone}`);
        }

        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
        };

        switch (format) {
            case 'ISO':
                // ISO sempre é UTC, mas podemos simular o offset se necessário, 
                // porém new Date().toISOString() é sempre UTC.
                // Se o usuário quer ISO com offset, é complexo em JS puro sem bibliotecas.
                // Retornaremos ISO string padrão (UTC) e avisaremos, ou string formatada.
                return date.toISOString();
            case 'full':
                options.weekday = 'long';
                options.year = 'numeric';
                options.month = 'long';
                options.day = 'numeric';
                options.hour = '2-digit';
                options.minute = '2-digit';
                options.second = '2-digit';
                options.timeZoneName = 'long';
                break;
            case 'date_only':
                options.year = 'numeric';
                options.month = '2-digit';
                options.day = '2-digit';
                break;
            case 'time_only':
                options.hour = '2-digit';
                options.minute = '2-digit';
                options.second = '2-digit';
                options.timeZoneName = 'short';
                break;
            case 'locale':
            default:
                // Default locale format
                options.dateStyle = 'short';
                options.timeStyle = 'medium';
                break;
        }

        // Usar pt-BR como locale padrão para a resposta textual
        return new Intl.DateTimeFormat('pt-BR', options).format(date);
    }

    private listCommonTimezones(): string {
        return `Alguns fusos horários comuns:
- America/Sao_Paulo (Brasília)
- America/New_York (Nova York)
- Europe/London (Londres/UTC)
- Europe/Paris (Paris)
- Asia/Tokyo (Tóquio)
- Australia/Sydney (Sydney)
- UTC`;
    }
}
