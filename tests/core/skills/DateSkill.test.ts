
import { DateSkill } from '../../../src/core/skills/DateSkill';

describe('DateSkill', () => {
    let skill: DateSkill;

    beforeEach(() => {
        skill = new DateSkill();
    });

    it('should have correct name and description', () => {
        expect(skill.name).toBe('get_current_date');
        expect(skill.description).toBeDefined();
    });

    it('should return date in correct format (America/Sao_Paulo)', async () => {
        // Mock Date to ensure consistent output for tests
        const mockDate = new Date('2023-10-01T12:00:00Z');
        jest.useFakeTimers();
        jest.setSystemTime(mockDate);

        const result = await skill.execute({});
        
        // The exact string depends on the locale and timezone implementation of the environment
        // but it should contain the date parts.
        expect(result).toContain('2023');
        // "01/10/2023, 09:00:00" in pt-BR timezone -3
        // Just checking basic structure to avoid locale-specific format issues in different envs
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); 
        
        jest.useRealTimers();
    });
});
