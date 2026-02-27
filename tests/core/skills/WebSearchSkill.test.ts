import { WebSearchSkill } from '../../../src/core/skills/WebSearchSkill';
import * as DuckDuckScrape from 'duck-duck-scrape';

// Mock do duck-duck-scrape
jest.mock('duck-duck-scrape', () => ({
    search: jest.fn(),
    SafeSearchType: { 
        MODERATE: 'moderate',
        STRICT: 'strict',
        OFF: 'off'
    }
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
        expect(skill.parameters.properties.limit).toBeDefined();
        expect(skill.parameters.properties.safe_search).toBeDefined();
        expect(skill.parameters.properties.region).toBeDefined();
    });

    it('should handle search query execution with default params', async () => {
        (DuckDuckScrape.search as jest.Mock).mockResolvedValue({
            results: [
                { title: 'Result 1', url: 'http://example.com/1', description: 'Snippet 1' },
                { title: 'Result 2', url: 'http://example.com/2', description: 'Snippet 2' },
                { title: 'Result 3', url: 'http://example.com/3', description: 'Snippet 3' },
                { title: 'Result 4', url: 'http://example.com/4', description: 'Snippet 4' }
            ]
        });

        const result = await skill.execute({ query: 'test query' });
        
        // Default limit is 3, default safe_search is moderate, default region is br-pt
        expect(DuckDuckScrape.search).toHaveBeenCalledWith('test query', {
            safeSearch: 'moderate',
            locale: 'br-pt'
        });
        expect(result).toContain('Result 1');
        expect(result).toContain('Result 3');
        expect(result).not.toContain('Result 4'); // Should be limited to 3
    });

    it('should respect custom limit', async () => {
        (DuckDuckScrape.search as jest.Mock).mockResolvedValue({
            results: Array(10).fill(null).map((_, i) => ({ 
                title: `Result ${i+1}`, url: `http://example.com/${i+1}`, description: `Snippet ${i+1}` 
            }))
        });

        const result = await skill.execute({ query: 'test limit', limit: 5 });
        
        expect(result).toContain('Result 5');
        expect(result).not.toContain('Result 6');
    });

    it('should respect safe_search strict', async () => {
        (DuckDuckScrape.search as jest.Mock).mockResolvedValue({ results: [] });
        await skill.execute({ query: 'safe', safe_search: 'strict' });
        expect(DuckDuckScrape.search).toHaveBeenCalledWith('safe', expect.objectContaining({
            safeSearch: 'strict'
        }));
    });

    it('should respect custom region', async () => {
        (DuckDuckScrape.search as jest.Mock).mockResolvedValue({ results: [] });
        await skill.execute({ query: 'region', region: 'us-en' });
        expect(DuckDuckScrape.search).toHaveBeenCalledWith('region', expect.objectContaining({
            locale: 'us-en'
        }));
    });

    it('should handle empty results gracefully', async () => {
        (DuckDuckScrape.search as jest.Mock).mockResolvedValue({ results: [] });
        const result = await skill.execute({ query: 'no results' });
        expect(result).toContain('Nenhum resultado encontrado');
    });

    it('should handle errors gracefully', async () => {
        (DuckDuckScrape.search as jest.Mock).mockRejectedValue(new Error('Network error'));
        const result = await skill.execute({ query: 'error' });
        expect(result).toContain('Ocorreu um erro');
    });
});
