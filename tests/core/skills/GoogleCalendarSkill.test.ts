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
        expect(skill.parameters.properties.timeMin).toBeDefined();
        expect(skill.parameters.properties.startTime).toBeDefined();
        expect(skill.parameters.properties.endTime).toBeDefined();
    });

    it('should list events with default parameters', async () => {
        const mockCalendarList = mockCalendar.events.list;
        mockCalendarList.mockResolvedValue({
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

        expect(mockCalendarList).toHaveBeenCalledWith(expect.objectContaining({
            calendarId: 'primary',
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime'
        }));
        expect(result).toContain('Reunião');
        expect(result).toContain('ev1');
    });

    it('should list events with time range', async () => {
        const mockCalendarList = mockCalendar.events.list;
        mockCalendarList.mockResolvedValue({ data: { items: [] } });

        await skill.execute({
            action: 'list',
            timeMin: '2023-11-01T00:00:00Z',
            timeMax: '2023-11-30T23:59:59Z'
        });

        expect(mockCalendarList).toHaveBeenCalledWith(expect.objectContaining({
            timeMin: '2023-11-01T00:00:00Z',
            timeMax: '2023-11-30T23:59:59Z'
        }));
    });

    it('should create an event with timezone', async () => {
        const mockCalendarInsert = mockCalendar.events.insert;
        mockCalendarInsert.mockResolvedValue({
            data: {
                id: 'new_ev',
                htmlLink: 'http://calendar/event'
            }
        });

        const result = await skill.execute({
            action: 'create',
            summary: 'Nova Reunião',
            startTime: '2023-12-01T10:00:00',
            endTime: '2023-12-01T11:00:00',
            timeZone: 'Europe/London'
        });

        expect(mockCalendarInsert).toHaveBeenCalledWith(expect.objectContaining({
            calendarId: 'primary',
            requestBody: expect.objectContaining({
                summary: 'Nova Reunião',
                start: { dateTime: '2023-12-01T10:00:00', timeZone: 'Europe/London' },
                end: { dateTime: '2023-12-01T11:00:00', timeZone: 'Europe/London' }
            })
        }));
        expect(result).toContain('Evento criado com sucesso');
    });

    it('should update an event with timezone', async () => {
        const mockCalendarPatch = mockCalendar.events.patch;
        mockCalendarPatch.mockResolvedValue({
            data: { htmlLink: 'http://calendar/event' }
        });

        const result = await skill.execute({
            action: 'update',
            eventId: 'ev1',
            summary: 'Reunião Atualizada',
            startTime: '2023-12-01T10:00:00',
            timeZone: 'Asia/Tokyo'
        });

        expect(mockCalendarPatch).toHaveBeenCalledWith(expect.objectContaining({
            calendarId: 'primary',
            eventId: 'ev1',
            requestBody: expect.objectContaining({
                summary: 'Reunião Atualizada',
                start: { dateTime: '2023-12-01T10:00:00', timeZone: 'Asia/Tokyo' }
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
