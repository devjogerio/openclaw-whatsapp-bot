
import { OpenClawService } from '../../../src/infrastructure/ai/OpenClawService';
import { config } from '../../../src/config/env';
import axios from 'axios';
import { SkillRegistry } from '../../../src/core/services/SkillRegistry';

// Mock do axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenClawService', () => {
    let service: OpenClawService;
    let mockAxiosInstance: any;

    beforeEach(() => {
        mockAxiosInstance = {
            post: jest.fn(),
            interceptors: {
                request: { use: jest.fn() },
                response: { use: jest.fn() }
            }
        };
        mockedAxios.create.mockReturnValue(mockAxiosInstance);
        service = new OpenClawService(new SkillRegistry());
    });

    it('deve gerar resposta de texto com sucesso', async () => {
        const mockResponse = {
            data: {
                choices: [{
                    message: {
                        content: 'Resposta teste OpenClaw'
                    }
                }]
            }
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const response = await service.generateResponse('Olá');
        
        expect(response).toBe('Resposta teste OpenClaw');
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', expect.objectContaining({
            model: config.openclawModel,
            messages: expect.arrayContaining([{ role: 'user', content: 'Olá' }])
        }));
    });

    it('deve usar cache para requests repetidos', async () => {
        const mockResponse = {
            data: {
                choices: [{
                    message: {
                        content: 'Resposta cacheada'
                    }
                }]
            }
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        // Primeira chamada
        await service.generateResponse('Cache Teste');
        
        // Segunda chamada (deve vir do cache, sem novo post)
        const response2 = await service.generateResponse('Cache Teste');

        expect(response2).toBe('Resposta cacheada');
        expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('deve realizar retry em caso de erro 500', async () => {
        const error500 = { response: { status: 500 } };
        const successResponse = {
            data: {
                choices: [{
                    message: {
                        content: 'Sucesso após erro'
                    }
                }]
            }
        };

        mockAxiosInstance.post
            .mockRejectedValueOnce(error500)
            .mockResolvedValueOnce(successResponse);

        const response = await service.generateResponse('Retry Teste');
        
        expect(response).toBe('Sucesso após erro');
        expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('deve lançar erro se falhar todas as tentativas', async () => {
        const error500 = { response: { status: 500 } };
        mockAxiosInstance.post.mockRejectedValue(error500);

        await expect(service.generateResponse('Falha Total')).rejects.toEqual(error500);
        expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3); // 3 tentativas padrão
    }, 10000); // Aumenta timeout para 10s devido ao backoff

    it('deve gerar resposta em stream', async () => {
        const streamData = [
            'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":" World"}}]}\n\n',
            'data: [DONE]\n\n'
        ];
        
        // Mock do stream response
        const mockStream = {
            data: (async function* () {
                for (const chunk of streamData) {
                    yield chunk;
                }
            })()
        };

        mockAxiosInstance.post.mockResolvedValue(mockStream);

        const generator = service.generateResponseStream!('Stream Test');
        let result = '';
        for await (const chunk of generator) {
            result += chunk;
        }

        expect(result).toBe('Hello World');
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', expect.objectContaining({
            stream: true
        }), expect.objectContaining({
            responseType: 'stream'
        }));
    });
});
