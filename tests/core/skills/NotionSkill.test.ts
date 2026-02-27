import { NotionSkill } from '../../../src/core/skills/NotionSkill';
import { config } from '../../../src/config/env';

// Mock do @notionhq/client
const mockSearch = jest.fn();
const mockPagesCreate = jest.fn();
const mockPagesUpdate = jest.fn(); // Para archive
const mockBlocksChildrenList = jest.fn();
const mockBlocksChildrenAppend = jest.fn();
const mockDatabasesQuery = jest.fn(); // Para query_database

jest.mock('@notionhq/client', () => {
    return {
        Client: jest.fn().mockImplementation(() => {
            return {
                search: mockSearch,
                pages: {
                    create: mockPagesCreate,
                    update: mockPagesUpdate,
                },
                blocks: {
                    children: {
                        list: mockBlocksChildrenList,
                        append: mockBlocksChildrenAppend,
                    },
                },
                databases: {
                    query: mockDatabasesQuery,
                },
            };
        }),
    };
});

describe('NotionSkill', () => {
    let skill: NotionSkill;
    const originalApiKey = config.notionApiKey;

    beforeEach(() => {
        config.notionApiKey = 'mock-api-key';
        skill = new NotionSkill();
        jest.clearAllMocks();
    });

    afterAll(() => {
        config.notionApiKey = originalApiKey;
    });

    it('should have correct metadata', () => {
        expect(skill.name).toBe('notion');
        expect(skill.parameters).toBeDefined();
        expect(skill.parameters.properties.action.enum).toContain('archive_page');
        expect(skill.parameters.properties.action.enum).toContain('query_database');
    });

    it('should search for pages', async () => {
        mockSearch.mockResolvedValue({
            results: [
                {
                    object: 'page',
                    id: 'page-123',
                    url: 'https://notion.so/page-123',
                    properties: {
                        "Titulo": { // Nome da propriedade
                            type: 'title', // Tipo obrigatório para o find
                            title: [{ plain_text: 'Minha Página' }],
                        },
                    },
                },
            ],
        });

        const result = await skill.execute({ action: 'search', query: 'Minha' });
        expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ query: 'Minha' }));
        expect(result).toContain('Minha Página');
        expect(result).toContain('page-123');
    });

    it('should create a page', async () => {
        mockPagesCreate.mockResolvedValue({
            id: 'new-page-123',
            url: 'https://notion.so/new-page-123',
        });

        const result = await skill.execute({
            action: 'create_page',
            databaseId: 'db-123',
            title: 'Nova Tarefa',
            content: 'Descrição da tarefa',
        });

        expect(mockPagesCreate).toHaveBeenCalledWith(expect.objectContaining({
            parent: { database_id: 'db-123' },
            properties: expect.objectContaining({
                "Name": expect.objectContaining({ // O código usa "Name"
                    title: [{ text: { content: 'Nova Tarefa' } }],
                }),
            }),
            children: expect.arrayContaining([
                expect.objectContaining({
                    paragraph: {
                        rich_text: [{ text: { content: 'Descrição da tarefa' }, type: 'text' }],
                    },
                }),
            ]),
        }));
        expect(result).toContain('Página criada com sucesso');
        expect(result).toContain('new-page-123');
    });

    it('should archive a page', async () => {
        mockPagesUpdate.mockResolvedValue({ id: 'page-123', archived: true });

        const result = await skill.execute({
            action: 'archive_page',
            pageId: 'page-123',
        });

        expect(mockPagesUpdate).toHaveBeenCalledWith({
            page_id: 'page-123',
            archived: true,
        });
        expect(result).toContain('arquivada com sucesso');
    });

    it('should query database with filter', async () => {
        mockDatabasesQuery.mockResolvedValue({
            results: [
                {
                    id: 'task-1',
                    properties: {
                        Name: { type: 'title', title: [{ plain_text: 'Tarefa Importante' }] },
                    },
                },
            ],
        });

        const result = await skill.execute({
            action: 'query_database',
            databaseId: 'db-tasks',
            filter_status: 'Done',
        });

        expect(mockDatabasesQuery).toHaveBeenCalledWith(expect.objectContaining({
            database_id: 'db-tasks',
            filter: {
                property: 'Status',
                status: { equals: 'Done' },
            },
        }));
        expect(result).toContain('Tarefa Importante');
    });

    it('should handle errors gracefully', async () => {
        mockSearch.mockRejectedValue(new Error('API Error'));

        const result = await skill.execute({ action: 'search', query: 'Erro' });
        expect(result).toContain('Erro ao executar ação search');
        expect(result).toContain('API Error');
    });
});
