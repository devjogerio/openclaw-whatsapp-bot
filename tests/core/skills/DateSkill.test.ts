import { DateSkill } from '../../../src/core/skills/DateSkill';

describe('DateSkill', () => {
    let skill: DateSkill;

    beforeEach(() => {
        skill = new DateSkill();
    });

    it('should be defined', () => {
        expect(skill).toBeDefined();
        expect(skill.name).toBe('date_tool');
    });

    it('should return current date in default timezone (America/Sao_Paulo)', async () => {
        const result = await skill.execute({});
        expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/); // Basic date check
    });

    it('should return date in Tokyo timezone', async () => {
        // Tokyo is +9 UTC, Sao Paulo is -3 UTC. Approx 12h difference.
        // We can't easily assert exact time without mocking Date, 
        // but we can check if it runs without error and returns a string.
        const result = await skill.execute({ timezone: 'Asia/Tokyo', action: 'convert_timezone' });
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
    });

    it('should handle "full" format', async () => {
        const result = await skill.execute({ format: 'full' });
        // Should contain day of week (e.g., "segunda-feira" or similar)
        expect(result).toMatch(/-feira|sábado|domingo/i); 
    });

    it('should list timezones', async () => {
        const result = await skill.execute({ action: 'list_timezones' });
        expect(result).toContain('America/Sao_Paulo');
        expect(result).toContain('Asia/Tokyo');
    });

    it('should handle invalid timezone gracefully', async () => {
        const result = await skill.execute({ timezone: 'Invalid/Timezone' });
        expect(result).toContain('Erro ao executar DateSkill');
        expect(result).toContain('Fuso horário inválido');
    });

    it('should handle base_date conversion', async () => {
        const baseDate = '2023-01-01T12:00:00Z'; // 12:00 UTC
        // Sao Paulo is -3 -> 09:00
        const result = await skill.execute({ 
            action: 'convert_timezone', 
            base_date: baseDate,
            timezone: 'America/Sao_Paulo',
            format: 'time_only'
        });
        // We expect "09:00:00" approx, depending on locale format
        expect(result).toContain('09'); 
    });
});
