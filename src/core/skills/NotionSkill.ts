import { Client } from '@notionhq/client';
import { ISkill } from '../interfaces/ISkill';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

interface NotionParams {
    action: 'search' | 'create_page' | 'get_page_content' | 'append_block' | 'archive_page' | 'query_database' | 'update_page';
    query?: string;
    databaseId?: string;
    pageId?: string;
    title?: string;
    content?: string;
    filter_status?: string; // Legacy: manter para retrocompatibilidade
    filter_property?: string; // Novo: Nome da propriedade para filtrar
    filter_value?: string; // Novo: Valor para filtrar (texto exato ou opção)
    block_type?: 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3' | 'to_do' | 'bulleted_list_item'; // Novo
    properties?: Record<string, any>; // Novo: Propriedades para update/create
}

export class NotionSkill implements ISkill {
    name = 'notion';
    description = 'Integração com o Notion para gerenciar páginas e bancos de dados. Permite buscar, criar, ler, editar propriedades e arquivar páginas.';

    parameters = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['search', 'create_page', 'get_page_content', 'append_block', 'archive_page', 'query_database', 'update_page'],
                description: 'A ação a ser realizada no Notion.'
            },
            query: {
                type: 'string',
                description: 'Termo de busca (para action="search").'
            },
            databaseId: {
                type: 'string',
                description: 'ID do banco de dados (para create_page ou query_database).'
            },
            pageId: {
                type: 'string',
                description: 'ID da página (para get_page_content, append_block, archive_page ou update_page).'
            },
            title: {
                type: 'string',
                description: 'Título da nova página (para action="create_page").'
            },
            content: {
                type: 'string',
                description: 'Conteúdo de texto a ser adicionado (para create_page ou append_block).'
            },
            filter_status: {
                type: 'string',
                description: 'Filtrar por status em query_database (ex: "Done").'
            },
            filter_property: {
                type: 'string',
                description: 'Nome da propriedade para filtrar em query_database (ex: "Priority", "Category").'
            },
            filter_value: {
                type: 'string',
                description: 'Valor exato para o filtro (ex: "High", "Personal").'
            },
            block_type: {
                type: 'string',
                enum: ['paragraph', 'heading_1', 'heading_2', 'heading_3', 'to_do', 'bulleted_list_item'],
                description: 'Tipo do bloco a ser adicionado (padrão: paragraph).'
            },
            properties: {
                type: 'object',
                description: 'Objeto JSON com propriedades para atualizar (ex: {"Status": {"status": {"name": "Done"}}}).'
            }
        },
        required: ['action']
    };

    private notion: Client;

    constructor() {
        this.validateConfiguration();
        this.notion = new Client({
            auth: config.notionApiKey,
        });
    }

    private validateConfiguration() {
        if (!config.notionApiKey) {
            logger.warn('⚠️  Notion API Key não encontrada! A skill Notion não funcionará corretamente.');
            logger.warn('PARA CORRIGIR:');
            logger.warn('1. Obtenha seu Internal Integration Secret em https://www.notion.so/my-integrations');
            logger.warn('2. Adicione ao .env : NOTION_API_KEY=ntn_...');
            logger.warn('3. Crucial: No Notion, compartilhe as páginas/databases desejados com a sua integração (Menu ... > Connect to > Sua Integração).');
        }
    }

    async execute(params: NotionParams): Promise<string> {
        try {
            if (!config.notionApiKey) {
                return 'Erro: Notion API Key não configurada no servidor.';
            }

            switch (params.action) {
                case 'search':
                    return await this.search(params.query);
                case 'create_page':
                    return await this.createPage(params.databaseId, params.title, params.content);
                case 'get_page_content':
                    return await this.getPageContent(params.pageId);
                case 'append_block':
                    return await this.appendBlock(params.pageId, params.content, params.block_type);
                case 'archive_page':
                    return await this.archivePage(params.pageId);
                case 'query_database':
                    return await this.queryDatabase(params.databaseId, params.filter_status, params.filter_property, params.filter_value);
                case 'update_page':
                    return await this.updatePageProperties(params.pageId, params.properties);
                default:
                    return 'Ação inválida. Use: search, create_page, get_page_content, append_block, archive_page, query_database ou update_page.';
            }
        } catch (error: any) {
            logger.error('Erro na NotionSkill:', error);
            return `Erro ao executar ação ${params.action}: ${error.message}`;
        }
    }

    private async archivePage(pageId?: string): Promise<string> {
        if (!pageId) return 'Erro: pageId é obrigatório para arquivar uma página.';
        
        await this.notion.pages.update({
            page_id: pageId,
            archived: true,
        });

        return `Página ${pageId} arquivada com sucesso.`;
    }

    private async queryDatabase(databaseId?: string, filterStatus?: string, filterProperty?: string, filterValue?: string): Promise<string> {
        if (!databaseId) return 'Erro: databaseId é obrigatório para consultar um banco de dados.';

        const queryParams: any = {
            database_id: databaseId,
            page_size: 10,
        };

        if (filterProperty && filterValue) {
            // Suporte genérico a filtros de texto ou select
            queryParams.filter = {
                property: filterProperty,
                rich_text: {
                    contains: filterValue,
                },
            };
            // Tenta adivinhar se é select/status se falhar (melhoria futura: verificar tipo da propriedade)
            // Por enquanto, vamos assumir rich_text ou title como padrão seguro para busca genérica,
            // mas se o usuário passar filter_status (legacy), mantemos o comportamento anterior.
        } 
        
        if (filterStatus) {
            queryParams.filter = {
                property: 'Status',
                status: {
                    equals: filterStatus,
                },
            };
        }

        const response = await (this.notion.databases as any).query(queryParams);

        if (response.results.length === 0) {
            return 'Nenhum item encontrado no banco de dados com os filtros aplicados.';
        }

        return response.results.map((page: any) => {
            let title = 'Sem título';
            // Tenta encontrar a propriedade de título independentemente do nome
            const titleProp = Object.values(page.properties).find((p: any) => p.type === 'title') as any;
            if (titleProp && titleProp.title && titleProp.title.length > 0) {
                title = titleProp.title[0].plain_text;
            }
            
            return `- ${title} (ID: ${page.id})`;
        }).join('\n');
    }

    private async updatePageProperties(pageId?: string, properties?: Record<string, any>): Promise<string> {
        if (!pageId || !properties) {
            return 'Erro: pageId e properties são obrigatórios para atualizar uma página.';
        }

        try {
            await this.notion.pages.update({
                page_id: pageId,
                properties: properties,
            });
            return `Página ${pageId} atualizada com sucesso.`;
        } catch (e: any) {
            return `Erro ao atualizar página: ${e.message}`;
        }
    }

    private async search(query?: string): Promise<string> {
        const response = await this.notion.search({
            query: query,
            sort: {
                direction: 'descending',
                timestamp: 'last_edited_time',
            },
            page_size: 10,
        });

        if (response.results.length === 0) {
            return 'Nenhum resultado encontrado no Notion.';
        }

        const results = response.results.map((item: any) => {
            const type = item.object; // 'page' ou 'database'
            let title = 'Sem título';

            if (type === 'page') {
                // Tenta encontrar a propriedade de título (Title property)
                const titleProp = Object.values(item.properties).find((p: any) => p.type === 'title') as any;
                if (titleProp && titleProp.title && titleProp.title.length > 0) {
                    title = titleProp.title[0].plain_text;
                }
            } else if (type === 'database') {
                if (item.title && item.title.length > 0) {
                    title = item.title[0].plain_text;
                }
            }

            return `- [${type.toUpperCase()}] ${title} (ID: ${item.id})`;
        }).join('\n');

        return `Resultados da busca por "${query || 'tudo'}":\n${results}`;
    }

    private async createPage(databaseId?: string, title?: string, content?: string): Promise<string> {
        if (!databaseId || !title) {
            return 'Erro: databaseId e title são obrigatórios para criar uma página.';
        }

        const children: any[] = [];
        if (content) {
            children.push({
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: content,
                            },
                        },
                    ],
                },
            });
        }

        // Nota: Assumimos que a propriedade de título se chama "Name", que é o padrão.
        // Se o usuário mudou o nome da propriedade de título no database, isso pode falhar.
        // Uma melhoria futura seria buscar o schema do database antes.
        try {
            const response = await this.notion.pages.create({
                parent: {
                    database_id: databaseId,
                },
                properties: {
                    "Name": {
                        title: [
                            {
                                text: {
                                    content: title,
                                },
                            },
                        ],
                    },
                },
                children: children,
            });
             return `Página criada com sucesso! ID: ${response.id} URL: ${(response as any).url}`;
        } catch (e: any) {
             // Tenta com "title" minúsculo caso "Name" falhe, ou retorna erro sugerindo verificar
             return `Erro ao criar página: ${e.message}. Verifique se a propriedade de título do database se chama "Name".`;
        }
    }

    private async getPageContent(pageId?: string): Promise<string> {
        if (!pageId) {
            return 'Erro: pageId é obrigatório para ler o conteúdo.';
        }

        const response = await this.notion.blocks.children.list({
            block_id: pageId,
            page_size: 20,
        });

        const content = response.results.map((block: any) => {
            if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
                return block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
            } else if (block.type === 'heading_1' && block.heading_1.rich_text.length > 0) {
                return `# ${block.heading_1.rich_text.map((t: any) => t.plain_text).join('')}`;
            } else if (block.type === 'heading_2' && block.heading_2.rich_text.length > 0) {
                return `## ${block.heading_2.rich_text.map((t: any) => t.plain_text).join('')}`;
            } else if (block.type === 'heading_3' && block.heading_3.rich_text.length > 0) {
                return `### ${block.heading_3.rich_text.map((t: any) => t.plain_text).join('')}`;
            } else if (block.type === 'to_do' && block.to_do.rich_text.length > 0) {
                const check = block.to_do.checked ? '[x]' : '[ ]';
                return `${check} ${block.to_do.rich_text.map((t: any) => t.plain_text).join('')}`;
            } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item.rich_text.length > 0) {
                return `- ${block.bulleted_list_item.rich_text.map((t: any) => t.plain_text).join('')}`;
            }
            return ''; // Tipos não suportados ignorados por simplicidade
        }).filter(line => line !== '').join('\n');

        return content || 'Página vazia ou conteúdo não suportado (apenas texto simples é exibido).';
    }

    private async appendBlock(pageId?: string, content?: string, blockType: string = 'paragraph'): Promise<string> {
        if (!pageId || !content) {
            return 'Erro: pageId e content são obrigatórios para adicionar conteúdo.';
        }

        const block: any = {
            object: 'block',
            type: blockType,
        };

        const richText = [
            {
                type: 'text',
                text: {
                    content: content,
                },
            },
        ];

        if (['heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'paragraph'].includes(blockType)) {
             block[blockType] = { rich_text: richText };
        } else if (blockType === 'to_do') {
            block.to_do = { rich_text: richText, checked: false };
        } else {
            // Fallback to paragraph if unknown type
            block.type = 'paragraph';
            block.paragraph = { rich_text: richText };
        }

        await this.notion.blocks.children.append({
            block_id: pageId,
            children: [block],
        });

        return `Conteúdo (${blockType}) adicionado com sucesso ao final da página.`;
    }
}
