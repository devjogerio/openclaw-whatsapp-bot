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
    description = 'Realiza pesquisas na internet para encontrar informações atualizadas. Suporta filtros de segurança e limite de resultados.';
    parameters = {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'O termo ou pergunta a ser pesquisada no Google/DuckDuckGo.'
            },
            limit: {
                type: 'integer',
                description: 'Número máximo de resultados a retornar (padrão: 3, máx: 10).'
            },
            safe_search: {
                type: 'string',
                enum: ['strict', 'moderate', 'off'],
                description: 'Nível de filtro de segurança (padrão: moderate).'
            },
            region: {
                type: 'string',
                description: 'Região para focar a busca (ex: "br-pt" para Brasil, "us-en" para EUA). Padrão: "br-pt".'
            }
        },
        required: ['query']
    };

    async execute(args: { query: string; limit?: number; safe_search?: string; region?: string }): Promise<string> {
        try {
            const limit = Math.min(Math.max(args.limit || 3, 1), 10);
            const safeSearchMap: { [key: string]: SafeSearchType } = {
                'strict': SafeSearchType.STRICT,
                'moderate': SafeSearchType.MODERATE,
                'off': SafeSearchType.OFF
            };
            const safeSearch = safeSearchMap[args.safe_search || 'moderate'] || SafeSearchType.MODERATE;
            const region = args.region || 'br-pt';

            logger.info(`[Skill] Executando busca web para: "${args.query}" (Limit: ${limit}, Safe: ${args.safe_search}, Region: ${region})`);
            
            const results = await search(args.query, {
                safeSearch: safeSearch,
                locale: region
            });

            if (!results.results || results.results.length === 0) {
                return `Nenhum resultado encontrado para "${args.query}".`;
            }

            // Formata os resultados
            const topResults = results.results.slice(0, limit).map((result: SearchResult, index: number) => {
                return `${index + 1}. [${result.title}](${result.url})\n   ${result.description}`;
            }).join('\n\n');

            return `🔍 Resultados da busca para "${args.query}":\n\n${topResults}`;
        } catch (error: any) {
            logger.error(`Erro na WebSearchSkill: ${error.message}`);
            return 'Ocorreu um erro ao realizar a pesquisa na web. Tente novamente mais tarde.';
        }
    }
}
