import { ISkill } from '../interfaces/ISkill';
import { logger } from '../../utils/logger';
import { search, SafeSearchType, SearchResult } from 'duck-duck-scrape';

export class WebSearchSkill implements ISkill {
    name = 'web_search';
    description = 'Realiza pesquisas na internet para encontrar informações atualizadas.';
    parameters = {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'O termo ou pergunta a ser pesquisada no Google/DuckDuckGo.'
            }
        },
        required: ['query']
    };

    async execute(args: { query: string }): Promise<string> {
        try {
            logger.info(`[Skill] Executando busca web para: "${args.query}"`);
            
            const results = await search(args.query, {
                safeSearch: SafeSearchType.MODERATE
            });

            if (!results.results || results.results.length === 0) {
                return 'Nenhum resultado encontrado para esta pesquisa.';
            }

            // Formata os top 3 resultados
            const topResults = results.results.slice(0, 3).map((result: SearchResult) => {
                return `Title: ${result.title}\nURL: ${result.url}\nSnippet: ${result.description}\n`;
            }).join('\n---\n');

            return `Resultados da busca para "${args.query}":\n\n${topResults}`;
        } catch (error) {
            logger.error(error, 'Erro ao executar WebSearchSkill');
            return 'Ocorreu um erro ao realizar a pesquisa na web.';
        }
    }
}
