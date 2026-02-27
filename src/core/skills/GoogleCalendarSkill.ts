import { google, calendar_v3 } from 'googleapis';
import { ISkill } from '../interfaces/ISkill';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

interface CalendarParams {
    action: 'list' | 'create' | 'update' | 'delete';
    summary?: string;
    description?: string;
    location?: string;
    startTime?: string; // ISO 8601 (Create/Update: Start of event. List: Filter start range)
    endTime?: string;   // ISO 8601 (Create/Update: End of event. List: Filter end range)
    eventId?: string;
    maxResults?: number;
    attendees?: string[];
    query?: string;     // Text search for events
}

export class GoogleCalendarSkill implements ISkill {
    name = 'google_calendar';
    description = 'Gerencia eventos no Google Calendar. Permite listar (com filtros), criar, atualizar e excluir eventos.';
    
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
                description: 'Data e hora de início no formato ISO 8601. Na listagem, serve como filtro inicial (timeMin).'
            },
            endTime: {
                type: 'string',
                description: 'Data e hora de término no formato ISO 8601. Na listagem, serve como filtro final (timeMax).'
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
            },
            query: {
                type: 'string',
                description: 'Termo de busca para filtrar eventos por texto (apenas na ação list).'
            }
        },
        required: ['action']
    };

    private calendar: calendar_v3.Calendar;

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
        const { maxResults, startTime, endTime, query } = params;
        
        const requestParams: any = {
            calendarId: 'primary',
            timeMin: startTime || new Date().toISOString(),
            maxResults: maxResults || 10,
            singleEvents: true,
            orderBy: 'startTime',
        };

        if (endTime) requestParams.timeMax = endTime;
        if (query) requestParams.q = query;

        const res = await this.calendar.events.list(requestParams);

        const events = res.data.items;
        if (!events || events.length === 0) {
            let msg = 'Nenhum evento encontrado';
            if (startTime) msg += ` a partir de ${startTime}`;
            if (endTime) msg += ` até ${endTime}`;
            if (query) msg += ` com o termo "${query}"`;
            return msg + '.';
        }

        return events.map((event: any, i: number) => {
            const start = event.start.dateTime || event.start.date;
            const end = event.end.dateTime || event.end.date;
            return `${i + 1}. [${start} - ${end}] ${event.summary} (ID: ${event.id})`;
        }).join('\n');
    }

    private async createEvent(params: CalendarParams): Promise<string> {
        if (!params.summary || !params.startTime || !params.endTime) {
            return 'Erro: summary, startTime e endTime são obrigatórios para criar um evento.';
        }

        const event = {
            summary: params.summary,
            description: params.description,
            location: params.location,
            start: {
                dateTime: params.startTime,
                timeZone: 'America/Sao_Paulo', // Pode ser parametrizável futuramente
            },
            end: {
                dateTime: params.endTime,
                timeZone: 'America/Sao_Paulo',
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

        // Primeiro, buscamos o evento existente para preservar campos não alterados
        // Mas para simplificar, a API do Google permite patch.
        // Se usarmos 'update', precisamos passar o recurso completo. Se usarmos 'patch', apenas os campos alterados.
        // Vamos usar patch para flexibilidade.

        const patchBody: any = {};
        if (params.summary) patchBody.summary = params.summary;
        if (params.description) patchBody.description = params.description;
        if (params.location) patchBody.location = params.location;
        if (params.startTime) patchBody.start = { dateTime: params.startTime };
        if (params.endTime) patchBody.end = { dateTime: params.endTime };
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
