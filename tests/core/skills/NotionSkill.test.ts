import { NotionSkill } from '../../../src/core/skills/NotionSkill';
import { config } from '../../../src/config/env';

// Mock do Client do Notion
const mockSearch = jest.fn();
const mockPagesCreate = jest.fn();
const mockBlocksChildrenList = jest.fn();
const mockBlocksChildrenAppend = jest.fn();

jest.mock('@notionhq/client', () => {
    return {
        Client: jest.fn().mockImplementation(() => {
            return {
                search: mockSearch,
                pages: {
                    create: mockPagesCreate
                },
                blocks: {
                    children: {
                        list: mockBlocksChildrenList,
                        append: mockBlocksChildrenAppend
                    }
                }
            };
        })
    };
});

describe('NotionSkill', () => {
    let skill: NotionSkill;

    beforeEach(() => {
        jest.clearAllMocks();
        // Configura API Key para testes
        config.notionApiKey = 'mock-api-key';
        skill = new NotionSkill();
    });

    it('should be defined', () => {
        expect(skill).toBeDefined();
        expect(skill.name).toBe('notion');
    });

    it('should search pages/databases correctly', async () => {
        const mockResults = [
            {
                object: 'page',
                id: 'page-123',
                properties: {
                    Name: {
                        type: 'title',
                        title: [{ plain_text: 'Minha Página' }]
                    }
                }
            },
            {
                object: 'database',
                id: 'db-456',
                title: [{ plain_text: 'Meu Database' }]
            }
        ];

        mockSearch.mockResolvedValue({ results: mockResults });

        const result = await skill.execute({ action: 'search', query: 'teste' });

        expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ query: 'teste' }));
        expect(result).toContain('Minha Página');
        expect(result).toContain('Meu Database');
        expect(result).toContain('page-123');
        expect(result).toContain('db-456');
    });

    it('should handle empty search results', async () => {
        mockSearch.mockResolvedValue({ results: [] });
        const result = await skill.execute({ action: 'search', query: 'nada' });
        expect(result).toBe('Nenhum resultado encontrado no Notion.');
    });

    it('should create a page correctly', async () => {
        mockPagesCreate.mockResolvedValue({ id: 'new-page-id', url: 'http://notion.so/new-page' });

        const result = await skill.execute({
            action: 'create_page',
            databaseId: 'db-123',
            title: 'Nova Tarefa',
            content: 'Detalhes da tarefa'
        });

        expect(mockPagesCreate).toHaveBeenCalledWith(expect.objectContaining({
            parent: { database_id: 'db-123' },
            properties: {
                "Name": {
                    title: [{ text: { content: 'Nova Tarefa' } }]
                }
            }
        }));
        expect(result).toContain('Página criada com sucesso');
        expect(result).toContain('new-page-id');
    });

    it('should handle errors gracefully', async () => {
        mockSearch.mockRejectedValue(new Error('API Error'));
        const result = await skill.execute({ action: 'search' });
        expect(result).toContain('Erro ao executar ação search');
        expect(result).toContain('API Error');
    });

    it('should require databaseId and title for create_page', async () => {
        const result = await skill.execute({ action: 'create_page', title: 'Só Título' });
        expect(result).toContain('Erro: databaseId e title são obrigatórios');
    });
});
