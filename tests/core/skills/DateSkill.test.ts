import { DateSkill } from '../../../src/core/skills/DateSkill';

describe('DateSkill', () => {
    let skill: DateSkill;

    beforeEach(() => {
        skill = new DateSkill();
    });

    it('should have correct metadata', () => {
        expect(skill.name).toBe('date_tool');
        expect(skill.description).toBeDefined();
        expect(skill.parameters).toBeDefined();
        expect(skill.parameters.properties.action).toBeDefined();
        expect(skill.parameters.properties.timezone).toBeDefined();
        expect(skill.parameters.properties.format).toBeDefined();
    });

    it('should return current date in default timezone (America/Sao_Paulo)', async () => {
        const result = await skill.execute({});
        expect(result).toBeDefined();
        // Just check if it returns a string, content depends on time
        expect(typeof result).toBe('string');
    });

    it('should convert timezone correctly', async () => {
        // Mock Date to a fixed time: 2023-01-01T12:00:00Z
        const mockDate = new Date('2023-01-01T12:00:00Z');
        jest.useFakeTimers().setSystemTime(mockDate);

        // UTC: 12:00
        const resultUTC = await skill.execute({ 
            action: 'convert_timezone', 
            timezone: 'UTC', 
            format: 'ISO' 
        });
        expect(resultUTC).toContain('2023-01-01T12:00:00');

        // Sao_Paulo: 09:00 (UTC-3)
        const resultSP = await skill.execute({ 
            action: 'convert_timezone', 
            timezone: 'America/Sao_Paulo', 
            format: 'ISO' 
        });
        expect(resultSP).toContain('2023-01-01T09:00:00');

        jest.useRealTimers();
    });

    it('should handle different formats', async () => {
        const mockDate = new Date('2023-01-01T12:00:00Z');
        jest.useFakeTimers().setSystemTime(mockDate);

        const resultFull = await skill.execute({ format: 'full', timezone: 'UTC' });
        expect(resultFull).toMatch(/domingo, 1 de janeiro de 2023/i);

        const resultDateOnly = await skill.execute({ format: 'date_only', timezone: 'UTC' });
        expect(resultDateOnly).toMatch(/01\/01\/2023/);

        jest.useRealTimers();
    });

    it('should list common timezones', async () => {
        const result = await skill.execute({ action: 'list_timezones' });
        expect(result).toContain('America/Sao_Paulo');
        expect(result).toContain('UTC');
        expect(result).toContain('Asia/Tokyo');
    });

    it('should handle invalid timezone gracefully', async () => {
        const result = await skill.execute({ timezone: 'Invalid/Timezone' });
        expect(result).toContain('Erro ao executar DateSkill');
        expect(result).toContain('Fuso horário inválido');
    });

    it('should handle base_date parameter', async () => {
        const baseDate = '2025-12-25T10:00:00Z';
        const result = await skill.execute({ 
            base_date: baseDate, 
            timezone: 'UTC', 
            format: 'ISO' 
        });
        expect(result).toContain('2025-12-25T10:00:00');
    });

    it('should calculate date correctly (add_time)', async () => {
        const baseDate = '2023-01-01T12:00:00Z';
        // Add 2 days
        const resultDays = await skill.execute({
            action: 'add_time',
            base_date: baseDate,
            amount: 2,
            unit: 'days',
            format: 'ISO',
            timezone: 'UTC'
        });
        expect(resultDays).toContain('2023-01-03T12:00:00');

        // Add 3 hours
        const resultHours = await skill.execute({
            action: 'add_time',
            base_date: baseDate,
            amount: 3,
            unit: 'hours',
            format: 'ISO',
            timezone: 'UTC'
        });
        expect(resultHours).toContain('2023-01-01T15:00:00');
    });

    it('should calculate date correctly (subtract_time)', async () => {
        const baseDate = '2023-01-01T12:00:00Z';
        // Subtract 1 week
        const resultWeeks = await skill.execute({
            action: 'subtract_time',
            base_date: baseDate,
            amount: 1,
            unit: 'weeks',
            format: 'ISO',
            timezone: 'UTC'
        });
        // 2022-12-25
        expect(resultWeeks).toContain('2022-12-25T12:00:00');

        // Subtract 30 minutes
        const resultMinutes = await skill.execute({
            action: 'subtract_time',
            base_date: baseDate,
            amount: 30,
            unit: 'minutes',
            format: 'ISO',
            timezone: 'UTC'
        });
        // 11:30
        expect(resultMinutes).toContain('2023-01-01T11:30:00');
    });

    it('should validate calculation parameters', async () => {
        const result = await skill.execute({
            action: 'add_time',
            amount: 10
            // Missing unit
        });
        expect(result).toContain('Erro ao executar DateSkill');
        expect(result).toContain('são obrigatórios');
    });
});
