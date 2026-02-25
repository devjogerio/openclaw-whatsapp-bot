import { GoogleCalendarSkill } from '../../../src/core/skills/GoogleCalendarSkill';
import { google } from 'googleapis';

// Mock do googleapis
jest.mock('googleapis', () => {
    const mOAuth2 = {
        setCredentials: jest.fn(),
    };
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
                OAuth2: jest.fn(() => mOAuth2),
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
        // Acessa o mock retornado pelo google.calendar()
        mockCalendar = (google.calendar as jest.Mock)();
    });

    it('should list events correctly', async () => {
        const mockEvents = [
            {
                id: '123',
                summary: 'Reunião',
                start: { dateTime: '2023-10-27T10:00:00-03:00' },
            },
        ];
        mockCalendar.events.list.mockResolvedValue({
            data: { items: mockEvents },
        });

        const result = await skill.execute({ action: 'list', maxResults: 5 });

        expect(mockCalendar.events.list).toHaveBeenCalledWith(expect.objectContaining({
            maxResults: 5,
        }));
        expect(result).toContain('Reunião');
        expect(result).toContain('123');
    });

    it('should create an event correctly', async () => {
        mockCalendar.events.insert.mockResolvedValue({
            data: { id: 'new-id', htmlLink: 'http://link' },
        });

        const params = {
            action: 'create' as const,
            summary: 'Novo Evento',
            startTime: '2023-10-28T10:00:00Z',
            endTime: '2023-10-28T11:00:00Z',
        };

        const result = await skill.execute(params);

        expect(mockCalendar.events.insert).toHaveBeenCalledWith(expect.objectContaining({
            requestBody: expect.objectContaining({
                summary: 'Novo Evento',
            }),
        }));
        expect(result).toContain('Evento criado com sucesso');
    });

    it('should handle errors gracefully', async () => {
        mockCalendar.events.list.mockRejectedValue(new Error('API Error'));

        const result = await skill.execute({ action: 'list' });

        expect(result).toContain('Erro ao executar ação list');
        expect(result).toContain('API Error');
    });
});
