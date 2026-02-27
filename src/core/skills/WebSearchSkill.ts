import { ISkill } from '../interfaces/ISkill';
import { logger } from '../../utils/logger';
import { search, SafeSearchType, SearchResult } from 'duck-duck-scrape';

interface WebSearchParams {
    query: string;
    limit?: number;
    safe_search?: 'strict' | 'moderate' | 'off';
    locale?: string;
}

export class WebSearchSkill implements ISkill {
    name = 'web_search';
    description = 'Realiza pesquisas na internet para encontrar informações atualizadas com opções de filtro e limite.';
    parameters = {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'O termo ou pergunta a ser pesquisada no Google/DuckDuckGo.'
            },
            limit: {
                type: 'number',
                description: 'Número máximo de resultados a retornar (padrão: 3, máx: 10).'
            },
            safe_search: {
                type: 'string',
                enum: ['strict', 'moderate', 'off'],
                description: 'Nível de filtro de segurança (padrão: moderate).'
            },
            locale: {
                type: 'string',
                description: 'Código de região para os resultados (ex: "pt-br", "us-en").'
            }
        },
        required: ['query']
    };

    async execute(args: WebSearchParams): Promise<string> {
        try {
            logger.info(`[Skill] Executando busca web para: "${args.query}" (Limit: ${args.limit}, Safe: ${args.safe_search})`);
            
            const safeSearchMap: Record<string, SafeSearchType> = {
                'strict': SafeSearchType.STRICT,
                'moderate': SafeSearchType.MODERATE,
                'off': SafeSearchType.OFF
            };

            const options: any = {
                safeSearch: safeSearchMap[args.safe_search || 'moderate']
            };

            if (args.locale) {
                options.locale = args.locale;
            }

            const results = await search(args.query, options);

            if (!results.results || results.results.length === 0) {
                return 'Nenhum resultado encontrado para esta pesquisa.';
            }

            const limit = Math.min(Math.max(args.limit || 3, 1), 10);

            // Formata os resultados
            const topResults = results.results.slice(0, limit).map((result: SearchResult, index: number) => {
                return `[${index + 1}] ${result.title}\nURL: ${result.url}\nSnippet: ${result.description}\n`;
            }).join('\n---\n');

            return `Resultados da busca para "${args.query}":\n\n${topResults}`;
        } catch (error: any) {
            logger.error(error, 'Erro ao executar WebSearchSkill');
            return `Ocorreu um erro ao realizar a pesquisa na web: ${error.message}`;
        }
    }
}
