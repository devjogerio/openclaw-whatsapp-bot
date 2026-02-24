import { WebSearchSkill } from '../../../src/core/skills/WebSearchSkill';
import * as DuckDuckScrape from 'duck-duck-scrape';

jest.mock('duck-duck-scrape', () => ({
    search: jest.fn(),
    SafeSearchType: { MODERATE: 'moderate' }
}));

describe('WebSearchSkill', () => {
    let skill: WebSearchSkill;

    beforeEach(() => {
        skill = new WebSearchSkill();
        (DuckDuckScrape.search as jest.Mock).mockClear();
    });

    it('should have correct metadata', () => {
        expect(skill.name).toBe('web_search');
        expect(skill.description).toBeDefined();
        expect(skill.parameters).toBeDefined();
    });

    it('should handle search query execution', async () => {
        (DuckDuckScrape.search as jest.Mock).mockResolvedValue({
            results: [
                { title: 'Result 1', url: 'http://example.com/1', description: 'Snippet 1' },
                { title: 'Result 2', url: 'http://example.com/2', description: 'Snippet 2' }
            ]
        });

        const result = await skill.execute({ query: 'test query' });
        
        expect(DuckDuckScrape.search).toHaveBeenCalledWith('test query', expect.any(Object));
        expect(result).toContain('Result 1');
        expect(result).toContain('http://example.com/1');
    });

    it('should handle empty results gracefully', async () => {
        (DuckDuckScrape.search as jest.Mock).mockResolvedValue({ results: [] });

        const result = await skill.execute({ query: 'no results' });
        expect(result).toContain('Nenhum resultado encontrado');
    });
});
