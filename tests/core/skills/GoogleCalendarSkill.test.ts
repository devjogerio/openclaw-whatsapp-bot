import { GoogleCalendarSkill } from '../../../src/core/skills/GoogleCalendarSkill';
import { google } from 'googleapis';

// Mock googleapis
jest.mock('googleapis', () => {
    const mCalendar = {
        events: {
            list: jest.fn(),
            insert: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn()
        }
    };
    return {
        google: {
            auth: {
                OAuth2: jest.fn().mockImplementation(() => ({
                    setCredentials: jest.fn()
                }))
            },
            calendar: jest.fn(() => mCalendar)
        }
    };
});

describe('GoogleCalendarSkill', () => {
    let skill: GoogleCalendarSkill;
    let mockCalendar: any;

    beforeEach(() => {
        jest.clearAllMocks();
        skill = new GoogleCalendarSkill();
        // Access the mocked calendar instance
        mockCalendar = (google.calendar as jest.Mock)();
    });

    it('should have correct metadata', () => {
        expect(skill.name).toBe('google_calendar');
        expect(skill.parameters.properties.query).toBeDefined();
        expect(skill.parameters.properties.startTime).toBeDefined();
        expect(skill.parameters.properties.endTime).toBeDefined();
    });

    it('should list events with default parameters', async () => {
        mockCalendar.events.list.mockResolvedValue({
            data: {
                items: [
                    {
                        id: 'ev1',
                        summary: 'Reunião',
                        start: { dateTime: '2023-10-27T10:00:00Z' },
                        end: { dateTime: '2023-10-27T11:00:00Z' }
                    }
                ]
            }
        });

        const result = await skill.execute({ action: 'list' });

        expect(mockCalendar.events.list).toHaveBeenCalledWith(expect.objectContaining({
            calendarId: 'primary',
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime'
        }));
        expect(result).toContain('Reunião');
        expect(result).toContain('ev1');
    });

    it('should list events with query and time range', async () => {
        mockCalendar.events.list.mockResolvedValue({ data: { items: [] } });

        await skill.execute({
            action: 'list',
            query: 'Projeto',
            startTime: '2023-11-01T00:00:00Z',
            endTime: '2023-11-30T23:59:59Z'
        });

        expect(mockCalendar.events.list).toHaveBeenCalledWith(expect.objectContaining({
            q: 'Projeto',
            timeMin: '2023-11-01T00:00:00Z',
            timeMax: '2023-11-30T23:59:59Z'
        }));
    });

    it('should create an event', async () => {
        mockCalendar.events.insert.mockResolvedValue({
            data: {
                id: 'new_ev',
                htmlLink: 'http://calendar/event'
            }
        });

        const result = await skill.execute({
            action: 'create',
            summary: 'Nova Reunião',
            startTime: '2023-12-01T10:00:00Z',
            endTime: '2023-12-01T11:00:00Z'
        });

        expect(mockCalendar.events.insert).toHaveBeenCalledWith(expect.objectContaining({
            calendarId: 'primary',
            requestBody: expect.objectContaining({
                summary: 'Nova Reunião',
                start: expect.objectContaining({ dateTime: '2023-12-01T10:00:00Z' }),
                end: expect.objectContaining({ dateTime: '2023-12-01T11:00:00Z' })
            })
        }));
        expect(result).toContain('Evento criado com sucesso');
    });

    it('should update an event', async () => {
        mockCalendar.events.patch.mockResolvedValue({
            data: { htmlLink: 'http://calendar/event' }
        });

        const result = await skill.execute({
            action: 'update',
            eventId: 'ev1',
            summary: 'Reunião Atualizada'
        });

        expect(mockCalendar.events.patch).toHaveBeenCalledWith(expect.objectContaining({
            calendarId: 'primary',
            eventId: 'ev1',
            requestBody: expect.objectContaining({
                summary: 'Reunião Atualizada'
            })
        }));
        expect(result).toContain('Evento atualizado com sucesso');
    });

    it('should delete an event', async () => {
        mockCalendar.events.delete.mockResolvedValue({});

        const result = await skill.execute({
            action: 'delete',
            eventId: 'ev1'
        });

        expect(mockCalendar.events.delete).toHaveBeenCalledWith(expect.objectContaining({
            calendarId: 'primary',
            eventId: 'ev1'
        }));
        expect(result).toContain('Evento excluído com sucesso');
    });

    it('should handle errors gracefully', async () => {
        mockCalendar.events.list.mockRejectedValue(new Error('API Error'));

        const result = await skill.execute({ action: 'list' });

        expect(result).toContain('Erro ao executar ação list');
        expect(result).toContain('API Error');
    });
});
