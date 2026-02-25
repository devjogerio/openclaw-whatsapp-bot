import { Client } from '@notionhq/client';
import { ISkill } from '../interfaces/ISkill';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

interface NotionParams {
    action: 'search' | 'create_page' | 'get_page_content' | 'append_block';
    query?: string;
    databaseId?: string;
    pageId?: string;
    title?: string;
    content?: string;
}

export class NotionSkill implements ISkill {
    name = 'notion';
    description = 'Integração com o Notion para gerenciar páginas e bancos de dados. Permite buscar, criar páginas e adicionar conteúdo.';

    parameters = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['search', 'create_page', 'get_page_content', 'append_block'],
                description: 'A ação a ser realizada no Notion.'
            },
            query: {
                type: 'string',
                description: 'Termo de busca (para action="search").'
            },
            databaseId: {
                type: 'string',
                description: 'ID do banco de dados onde a página será criada (para action="create_page").'
            },
            pageId: {
                type: 'string',
                description: 'ID da página (para get_page_content ou append_block).'
            },
            title: {
                type: 'string',
                description: 'Título da nova página (para action="create_page").'
            },
            content: {
                type: 'string',
                description: 'Conteúdo de texto a ser adicionado (para create_page ou append_block).'
            }
        },
        required: ['action']
    };

    private notion: Client;

    constructor() {
        if (!config.notionApiKey) {
            logger.warn('Notion API Key não configurada. A skill Notion pode falhar.');
        }
        this.notion = new Client({
            auth: config.notionApiKey,
        });
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
                    return await this.appendBlock(params.pageId, params.content);
                default:
                    return 'Ação inválida. Use: search, create_page, get_page_content, ou append_block.';
            }
        } catch (error: any) {
            logger.error('Erro na NotionSkill:', error);
            return `Erro ao executar ação ${params.action}: ${error.message}`;
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

    private async appendBlock(pageId?: string, content?: string): Promise<string> {
        if (!pageId || !content) {
            return 'Erro: pageId e content são obrigatórios para adicionar conteúdo.';
        }

        await this.notion.blocks.children.append({
            block_id: pageId,
            children: [
                {
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
                },
            ],
        });

        return 'Conteúdo adicionado com sucesso ao final da página.';
    }
}
