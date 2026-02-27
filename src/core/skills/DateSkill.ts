import { ISkill } from '../interfaces/ISkill';

interface DateParams {
    action?: 'current_date' | 'convert_timezone' | 'list_timezones' | 'add_time' | 'subtract_time';
    timezone?: string;
    format?: 'ISO' | 'locale' | 'full' | 'time_only' | 'date_only';
    base_date?: string; // Para conversões futuras
    amount?: number; // Quantidade para adicionar/subtrair
    unit?: 'days' | 'hours' | 'minutes' | 'weeks'; // Unidade de tempo
}

export class DateSkill implements ISkill {
    name = 'date_tool';
    description = 'Ferramenta para obter data/hora, converter fusos, listar fusos e realizar cálculos de data (adicionar/subtrair tempo).';
    
    parameters = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                description: 'A ação a ser realizada. Padrão: "current_date".',
                enum: ['current_date', 'convert_timezone', 'list_timezones', 'add_time', 'subtract_time']
            },
            timezone: {
                type: 'string',
                description: 'O fuso horário desejado (ex: "America/Sao_Paulo", "UTC"). Padrão: "America/Sao_Paulo".'
            },
            format: {
                type: 'string',
                description: 'O formato de saída desejado.',
                enum: ['ISO', 'locale', 'full', 'time_only', 'date_only']
            },
            base_date: {
                type: 'string',
                description: 'Data base para conversão (ISO string). Se omitido, usa o momento atual.'
            },
            amount: {
                type: 'number',
                description: 'Quantidade de tempo para adicionar ou subtrair.'
            },
            unit: {
                type: 'string',
                enum: ['days', 'hours', 'minutes', 'weeks'],
                description: 'Unidade de tempo para o cálculo.'
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
                case 'add_time':
                case 'subtract_time':
                    return this.calculateDate(action, timezone, format, params.amount, params.unit, params.base_date);
                case 'list_timezones':
                    return this.listCommonTimezones();
                default:
                    return `Ação desconhecida: ${action}. Use 'current_date', 'convert_timezone', 'add_time', 'subtract_time' ou 'list_timezones'.`;
            }
        } catch (error: any) {
            return `Erro ao executar DateSkill: ${error.message}.`;
        }
    }

    private calculateDate(action: string, timezone: string, format: string, amount?: number, unit?: string, baseDateStr?: string): string {
        if (amount === undefined || !unit) {
            throw new Error('Parâmetros "amount" e "unit" são obrigatórios para cálculos de data.');
        }

        let date = baseDateStr ? new Date(baseDateStr) : new Date();
        if (baseDateStr && isNaN(date.getTime())) {
            throw new Error('Data base inválida.');
        }

        const multiplier = action === 'subtract_time' ? -1 : 1;
        
        switch (unit) {
            case 'days':
                date.setDate(date.getDate() + (amount * multiplier));
                break;
            case 'weeks':
                date.setDate(date.getDate() + (amount * 7 * multiplier));
                break;
            case 'hours':
                date.setHours(date.getHours() + (amount * multiplier));
                break;
            case 'minutes':
                date.setMinutes(date.getMinutes() + (amount * multiplier));
                break;
        }

        return this.formatDate(date, timezone, format);
    }

    private handleDate(timezone: string, format: string, baseDateStr?: string): string {
        let date = baseDateStr ? new Date(baseDateStr) : new Date();
        
        if (baseDateStr && isNaN(date.getTime())) {
            throw new Error('Data base inválida. Use formato ISO (ex: 2023-12-25T10:00:00Z).');
        }

        return this.formatDate(date, timezone, format);
    }

    private formatDate(date: Date, timezone: string, format: string): string {
        // Validação básica de timezone
        try {
            new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(date);
        } catch (e) {
            throw new Error(`Fuso horário inválido: ${timezone}`);
        }

        if (format === 'ISO') {
            // Retorna formato ISO-like ajustado ao fuso horário (YYYY-MM-DDTHH:mm:ss)
            const parts = new Intl.DateTimeFormat('sv-SE', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).format(date);
            return parts.replace(' ', 'T');
        }

        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
        };

        switch (format) {
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
                options.dateStyle = 'short';
                options.timeStyle = 'medium';
                break;
        }

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
