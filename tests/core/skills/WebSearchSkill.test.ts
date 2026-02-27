import { WebSearchSkill } from '../../../src/core/skills/WebSearchSkill';
import * as DuckDuckScrape from 'duck-duck-scrape';

jest.mock('duck-duck-scrape', () => ({
    search: jest.fn(),
    SafeSearchType: {
        STRICT: 'strict',
        MODERATE: 'moderate',
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
        expect(skill.parameters).toBeDefined();
        expect(skill.parameters.properties.limit).toBeDefined();
        expect(skill.parameters.properties.safe_search).toBeDefined();
        expect(skill.parameters.properties.region).toBeDefined();
    });

    it('should handle search query execution with default parameters', async () => {
        (DuckDuckScrape.search as jest.Mock).mockResolvedValue({
            results: [
                { title: 'Result 1', url: 'http://example.com/1', description: 'Snippet 1' },
                { title: 'Result 2', url: 'http://example.com/2', description: 'Snippet 2' },
                { title: 'Result 3', url: 'http://example.com/3', description: 'Snippet 3' },
                { title: 'Result 4', url: 'http://example.com/4', description: 'Snippet 4' }
            ]
        });

        const result = await skill.execute({ query: 'test query' });
        
        expect(DuckDuckScrape.search).toHaveBeenCalledWith('test query', expect.objectContaining({
            safeSearch: 'moderate',
            locale: 'br-pt'
        }));
        expect(result).toContain('Result 1');
        expect(result).toContain('Result 3');
        expect(result).not.toContain('Result 4'); // Default limit is 3
    });

    it('should handle custom parameters (limit, safe_search, region)', async () => {
        (DuckDuckScrape.search as jest.Mock).mockResolvedValue({
            results: [
                { title: 'Result 1', url: 'http://example.com/1', description: 'Snippet 1' },
                { title: 'Result 2', url: 'http://example.com/2', description: 'Snippet 2' }
            ]
        });

        const result = await skill.execute({
            query: 'test query',
            limit: 5,
            safe_search: 'strict',
            region: 'us-en'
        });
        
        expect(DuckDuckScrape.search).toHaveBeenCalledWith('test query', expect.objectContaining({
            safeSearch: 'strict',
            locale: 'us-en'
        }));
    });

    it('should handle empty results gracefully', async () => {
        (DuckDuckScrape.search as jest.Mock).mockResolvedValue({ results: [] });

        const result = await skill.execute({ query: 'no results' });
        expect(result).toContain('Nenhum resultado encontrado');
    });

    it('should handle errors gracefully', async () => {
        (DuckDuckScrape.search as jest.Mock).mockRejectedValue(new Error('API Error'));

        const result = await skill.execute({ query: 'error query' });
        expect(result).toContain('Ocorreu um erro ao realizar a pesquisa');
    });
});
