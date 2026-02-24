import { OllamaService } from '../src/infrastructure/ai/OllamaService';
import { SkillRegistry } from '../src/core/services/SkillRegistry';

// Mock do método chat globalmente para controle
const mockChat = jest.fn();

// Mock da lib Ollama
jest.mock('ollama', () => {
    return {
        Ollama: jest.fn().mockImplementation(() => ({
            chat: mockChat
        }))
    };
});

// Mock do logger
jest.mock('../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

// Mock da config
jest.mock('../src/config/env', () => ({
    config: {
        ollamaHost: 'http://localhost:11434',
        ollamaModel: 'test-model'
    }
}));

describe('OllamaService', () => {
    let service: OllamaService;
    let skillRegistry: SkillRegistry;

    beforeEach(() => {
        jest.clearAllMocks();
        skillRegistry = new SkillRegistry();
        service = new OllamaService(skillRegistry);
    });

    it('deve inicializar corretamente', () => {
        expect(service).toBeDefined();
    });

    it('deve gerar uma resposta simples', async () => {
        const mockResponse = {
            message: {
                role: 'assistant',
                content: 'Olá! Como posso ajudar?'
            }
        };
        mockChat.mockResolvedValue(mockResponse);

        const response = await service.generateResponse('Olá');

        expect(response).toBe('Olá! Como posso ajudar?');
        expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({
            model: 'test-model',
            messages: expect.arrayContaining([
                expect.objectContaining({ role: 'user', content: 'Olá' })
            ])
        }));
    });

    it('deve lidar com chamada de ferramentas (skills)', async () => {
        // Mock de uma skill
        const mockSkill = {
            name: 'test_skill',
            description: 'Skill de teste',
            parameters: {},
            execute: jest.fn().mockResolvedValue({ success: true })
        };
        skillRegistry.register(mockSkill);

        // Primeira resposta do modelo: chamada de ferramenta
        const firstResponse = {
            message: {
                role: 'assistant',
                content: '',
                tool_calls: [{
                    function: {
                        name: 'test_skill',
                        arguments: {}
                    }
                }]
            }
        };

        // Segunda resposta do modelo: resposta final
        const secondResponse = {
            message: {
                role: 'assistant',
                content: 'Skill executada com sucesso.'
            }
        };

        mockChat
            .mockResolvedValueOnce(firstResponse)
            .mockResolvedValueOnce(secondResponse);

        const response = await service.generateResponse('Execute a skill');

        expect(response).toBe('Skill executada com sucesso.');
        expect(mockSkill.execute).toHaveBeenCalled();
        expect(mockChat).toHaveBeenCalledTimes(2);
    });

    it('deve retornar mensagem de erro se a API falhar', async () => {
        mockChat.mockRejectedValue(new Error('Connection error'));

        const response = await service.generateResponse('Olá');

        expect(response).toContain('Desculpe, ocorreu um erro');
    });

    it('deve avisar que transcribeAudio não é suportado', async () => {
        const response = await service.transcribeAudio(Buffer.from('audio'));
        expect(response).toContain('não está disponível');
    });

    it('deve lançar erro para generateAudio', async () => {
        await expect(service.generateAudio('texto')).rejects.toThrow('TTS não suportado');
    });
});
