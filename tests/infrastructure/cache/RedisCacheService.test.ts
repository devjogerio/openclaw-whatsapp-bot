
import { RedisCacheService } from '../../../src/infrastructure/cache/RedisCacheService';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        flushall: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue('OK')
    }));
});

describe('RedisCacheService', () => {
    let service: RedisCacheService;
    let mockClient: any;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new RedisCacheService();
        // @ts-ignore
        mockClient = service.client; 
    });

    it('should connect', async () => {
        await service.connect();
        expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should get value', async () => {
        mockClient.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }));
        const result = await service.get('key');
        expect(result).toEqual({ foo: 'bar' });
        expect(mockClient.get).toHaveBeenCalledWith('key');
    });

    it('should return null on get error or missing', async () => {
        mockClient.get.mockResolvedValue(null);
        const result = await service.get('key');
        expect(result).toBeNull();
    });

    it('should set value', async () => {
        await service.set('key', { foo: 'bar' }, 60);
        expect(mockClient.set).toHaveBeenCalledWith(
            'key', 
            JSON.stringify({ foo: 'bar' }), 
            'EX', 
            60
        );
    });

    it('should getOrSet - return cached value', async () => {
        mockClient.get.mockResolvedValue(JSON.stringify('cached'));
        const fetcher = jest.fn();
        
        const result = await service.getOrSet('key', fetcher);
        
        expect(result).toBe('cached');
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('should getOrSet - fetch and cache if missing', async () => {
        mockClient.get.mockResolvedValue(null);
        const fetcher = jest.fn().mockResolvedValue('fetched');
        
        const result = await service.getOrSet('key', fetcher);
        
        expect(result).toBe('fetched');
        expect(fetcher).toHaveBeenCalled();
        expect(mockClient.set).toHaveBeenCalledWith(
            'key',
            JSON.stringify('fetched'),
            'EX',
            3600
        );
    });
});
