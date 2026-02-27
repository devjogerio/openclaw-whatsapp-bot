import { google, calendar_v3 } from 'googleapis';
import { ISkill } from '../interfaces/ISkill';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

interface CalendarParams {
    action: 'list' | 'create' | 'update' | 'delete';
    summary?: string;
    description?: string;
    location?: string;
    startTime?: string; // ISO 8601
    endTime?: string;   // ISO 8601
    timeMin?: string;   // ISO 8601 (para listagem)
    timeMax?: string;   // ISO 8601 (para listagem)
    timeZone?: string;  // Default: America/Sao_Paulo
    eventId?: string;
    maxResults?: number;
    attendees?: string[];
}

export class GoogleCalendarSkill implements ISkill {
    name = 'google_calendar';
    description = 'Gerencia eventos no Google Calendar. Permite listar, criar, atualizar e excluir eventos com suporte a fusos horários.';
    
    parameters = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['list', 'create', 'update', 'delete'],
                description: 'A ação a ser realizada no calendário.'
            },
            summary: {
                type: 'string',
                description: 'Título do evento (obrigatório para create/update).'
            },
            description: {
                type: 'string',
                description: 'Descrição detalhada do evento.'
            },
            location: {
                type: 'string',
                description: 'Local do evento.'
            },
            startTime: {
                type: 'string',
                description: 'Data e hora de início no formato ISO 8601 (ex: 2023-10-27T10:00:00).'
            },
            endTime: {
                type: 'string',
                description: 'Data e hora de término no formato ISO 8601.'
            },
            timeMin: {
                type: 'string',
                description: 'Data mínima para listagem de eventos (ISO 8601).'
            },
            timeMax: {
                type: 'string',
                description: 'Data máxima para listagem de eventos (ISO 8601).'
            },
            timeZone: {
                type: 'string',
                description: 'Fuso horário (ex: America/Sao_Paulo, UTC). Default: America/Sao_Paulo.'
            },
            eventId: {
                type: 'string',
                description: 'ID do evento (obrigatório para update/delete).'
            },
            maxResults: {
                type: 'number',
                description: 'Número máximo de eventos a listar (padrão 10).'
            },
            attendees: {
                type: 'array',
                items: { type: 'string' },
                description: 'Lista de emails dos participantes.'
            }
        },
        required: ['action']
    };

    private calendar: calendar_v3.Calendar;
    private readonly defaultTimeZone = 'America/Sao_Paulo';

    constructor() {
        const auth = new google.auth.OAuth2(
            config.googleClientId,
            config.googleClientSecret,
            config.googleRedirectUri
        );

        if (config.googleRefreshToken) {
            auth.setCredentials({
                refresh_token: config.googleRefreshToken
            });
        } else {
            logger.warn('Google Refresh Token não configurado. A skill de calendário pode falhar.');
        }

        this.calendar = google.calendar({ version: 'v3', auth });
    }

    async execute(params: CalendarParams): Promise<string> {
        try {
            switch (params.action) {
                case 'list':
                    return await this.listEvents(params);
                case 'create':
                    return await this.createEvent(params);
                case 'update':
                    return await this.updateEvent(params);
                case 'delete':
                    return await this.deleteEvent(params.eventId);
                default:
                    return 'Ação inválida. Use: list, create, update, ou delete.';
            }
        } catch (error: any) {
            logger.error('Erro na GoogleCalendarSkill:', error);
            return `Erro ao executar ação ${params.action}: ${error.message || error}`;
        }
    }

    private async listEvents(params: CalendarParams): Promise<string> {
        const timeMin = params.timeMin || new Date().toISOString();
        const timeMax = params.timeMax; // Opcional
        const maxResults = params.maxResults || 10;
        const timeZone = params.timeZone || this.defaultTimeZone;

        const requestParams: calendar_v3.Params$Resource$Events$List = {
            calendarId: 'primary',
            timeMin: timeMin,
            maxResults: maxResults,
            singleEvents: true,
            orderBy: 'startTime',
            timeZone: timeZone
        };

        if (timeMax) {
            requestParams.timeMax = timeMax;
        }

        const res = await this.calendar.events.list(requestParams);

        const events = res.data.items;
        if (!events || events.length === 0) {
            return `Nenhum evento encontrado a partir de ${timeMin}.`;
        }

        return events.map((event: any, i: number) => {
            const start = event.start.dateTime || event.start.date;
            return `${i + 1}. [${start}] ${event.summary} (ID: ${event.id})`;
        }).join('\n');
    }

    private async createEvent(params: CalendarParams): Promise<string> {
        if (!params.summary || !params.startTime || !params.endTime) {
            return 'Erro: summary, startTime e endTime são obrigatórios para criar um evento.';
        }

        const timeZone = params.timeZone || this.defaultTimeZone;

        const event = {
            summary: params.summary,
            description: params.description,
            location: params.location,
            start: {
                dateTime: params.startTime,
                timeZone: timeZone,
            },
            end: {
                dateTime: params.endTime,
                timeZone: timeZone,
            },
            attendees: params.attendees?.map(email => ({ email })),
        };

        const res = await this.calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });

        return `Evento criado com sucesso! Link: ${res.data.htmlLink} (ID: ${res.data.id})`;
    }

    private async updateEvent(params: CalendarParams): Promise<string> {
        if (!params.eventId) {
            return 'Erro: eventId é obrigatório para atualizar um evento.';
        }

        const timeZone = params.timeZone || 'America/Sao_Paulo';
        const patchBody: any = {};
        
        if (params.summary) patchBody.summary = params.summary;
        if (params.description) patchBody.description = params.description;
        if (params.location) patchBody.location = params.location;
        if (params.startTime) patchBody.start = { dateTime: params.startTime, timeZone };
        if (params.endTime) patchBody.end = { dateTime: params.endTime, timeZone };
        if (params.attendees) patchBody.attendees = params.attendees.map(email => ({ email }));

        const res = await this.calendar.events.patch({
            calendarId: 'primary',
            eventId: params.eventId,
            requestBody: patchBody,
        });

        return `Evento atualizado com sucesso! Link: ${res.data.htmlLink}`;
    }

    private async deleteEvent(eventId?: string): Promise<string> {
        if (!eventId) {
            return 'Erro: eventId é obrigatório para excluir um evento.';
        }

        await this.calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });

        return 'Evento excluído com sucesso.';
    }
}
