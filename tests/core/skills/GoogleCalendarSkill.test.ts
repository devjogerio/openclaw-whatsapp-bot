import { GoogleCalendarSkill } from '../../../src/core/skills/GoogleCalendarSkill';
import { google } from 'googleapis';

jest.mock('googleapis', () => {
    const mCalendar = {
        events: {
            list: jest.fn(),
            insert: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
        },
    };
    return {
        google: {
            auth: {
                OAuth2: jest.fn().mockImplementation(() => ({
                    setCredentials: jest.fn(),
                })),
            },
            calendar: jest.fn(() => mCalendar),
        },
    };
});

describe('GoogleCalendarSkill', () => {
    let skill: GoogleCalendarSkill;
    let mockCalendar: any;

    beforeEach(() => {
        jest.clearAllMocks();
        skill = new GoogleCalendarSkill();
        // @ts-ignore
        mockCalendar = google.calendar();
    });

    it('deve listar eventos com filtros de data e fuso horário', async () => {
        const mockEvents = [
            {
                id: '1',
                summary: 'Reunião',
                start: { dateTime: '2023-10-27T10:00:00-03:00' },
            },
        ];
        mockCalendar.events.list.mockResolvedValue({ data: { items: mockEvents } });

        const params = {
            action: 'list' as const,
            timeMin: '2023-10-27T00:00:00Z',
            timeMax: '2023-10-28T00:00:00Z',
            timeZone: 'UTC',
            maxResults: 5
        };

        const result = await skill.execute(params);

        expect(mockCalendar.events.list).toHaveBeenCalledWith(expect.objectContaining({
            calendarId: 'primary',
            timeMin: '2023-10-27T00:00:00Z',
            timeMax: '2023-10-28T00:00:00Z',
            timeZone: 'UTC',
            maxResults: 5,
            singleEvents: true,
            orderBy: 'startTime'
        }));
        expect(result).toContain('Reunião');
    });

    it('deve criar evento com fuso horário customizado', async () => {
        mockCalendar.events.insert.mockResolvedValue({
            data: { htmlLink: 'http://link', id: '123' }
        });

        const params = {
            action: 'create' as const,
            summary: 'Viagem',
            startTime: '2023-12-01T10:00:00',
            endTime: '2023-12-01T12:00:00',
            timeZone: 'Europe/London'
        };

        const result = await skill.execute(params);

        expect(mockCalendar.events.insert).toHaveBeenCalledWith(expect.objectContaining({
            calendarId: 'primary',
            requestBody: expect.objectContaining({
                summary: 'Viagem',
                start: { dateTime: '2023-12-01T10:00:00', timeZone: 'Europe/London' },
                end: { dateTime: '2023-12-01T12:00:00', timeZone: 'Europe/London' }
            })
        }));
        expect(result).toContain('Evento criado com sucesso');
    });

    it('deve usar fuso horário padrão (America/Sao_Paulo) se não fornecido', async () => {
        mockCalendar.events.insert.mockResolvedValue({
            data: { htmlLink: 'http://link', id: '123' }
        });

        const params = {
            action: 'create' as const,
            summary: 'Almoço',
            startTime: '2023-12-01T12:00:00',
            endTime: '2023-12-01T13:00:00'
        };

        await skill.execute(params);

        expect(mockCalendar.events.insert).toHaveBeenCalledWith(expect.objectContaining({
            requestBody: expect.objectContaining({
                start: expect.objectContaining({ timeZone: 'America/Sao_Paulo' })
            })
        }));
    });

    it('deve retornar mensagem amigável se nenhum evento for encontrado', async () => {
        mockCalendar.events.list.mockResolvedValue({ data: { items: [] } });

        const result = await skill.execute({ action: 'list' });

        expect(result).toContain('Nenhum evento encontrado');
    });

    it('deve tratar erros da API', async () => {
        mockCalendar.events.list.mockRejectedValue(new Error('API Error'));

        const result = await skill.execute({ action: 'list' });

        expect(result).toContain('Erro ao executar ação list: API Error');
    });
});
