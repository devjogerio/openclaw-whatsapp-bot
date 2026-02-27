import { ISkill } from '../interfaces/ISkill';
import { logger } from '../../utils/logger';
import { search, SafeSearchType, SearchResult } from 'duck-duck-scrape';

interface WebSearchParams {
    query: string;
    limit?: number;
    safe_search?: 'strict' | 'moderate' | 'off';
    region?: string; // e.g. 'br-pt', 'us-en'
}

export class WebSearchSkill implements ISkill {
    name = 'web_search';
    description = 'Realiza pesquisas na internet para encontrar informações atualizadas. Suporta filtros de segurança, região e limite de resultados.';
    
    parameters = {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'O termo ou pergunta a ser pesquisada no DuckDuckGo.'
            },
            limit: {
                type: 'number',
                description: 'Número máximo de resultados a retornar (padrão: 3, máximo: 10).',
                minimum: 1,
                maximum: 10
            },
            safe_search: {
                type: 'string',
                description: 'Nível de filtro de segurança (strict, moderate, off). Padrão: moderate.',
                enum: ['strict', 'moderate', 'off']
            },
            region: {
                type: 'string',
                description: 'Região para focar a busca (ex: "br-pt" para Brasil, "us-en" para EUA). Padrão: "br-pt".'
            }
        },
        required: ['query']
    };

    async execute(params: WebSearchParams): Promise<string> {
        try {
            const query = params.query;
            const limit = Math.min(params.limit || 3, 10);
            const region = params.region || 'br-pt';
            
            let safeSearch = SafeSearchType.MODERATE;
            if (params.safe_search === 'strict') safeSearch = SafeSearchType.STRICT;
            if (params.safe_search === 'off') safeSearch = SafeSearchType.OFF;

            logger.info(`[Skill] Executando busca web para: "${query}" (Limit: ${limit}, Region: ${region}, Safe: ${safeSearch})`);
            
            const results = await search(query, {
                safeSearch: safeSearch,
                locale: region
            });

            if (!results.results || results.results.length === 0) {
                return 'Nenhum resultado encontrado para esta pesquisa.';
            }

            // Formata os resultados
            const formattedResults = results.results.slice(0, limit).map((result: SearchResult, index: number) => {
                return `Result #${index + 1}\nTitle: ${result.title}\nURL: ${result.url}\nSnippet: ${result.description}\n`;
            }).join('\n---\n');

            return `Resultados da busca para "${query}" (${results.results.length} encontrados, mostrando ${limit}):\n\n${formattedResults}`;
        } catch (error: any) {
            logger.error(`Erro ao executar WebSearchSkill: ${error.message}`);
            return 'Ocorreu um erro ao realizar a pesquisa na web. Tente novamente mais tarde.';
        }
    }
}
