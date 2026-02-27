
import { MemoryCacheService } from '../../../src/infrastructure/cache/MemoryCacheService';

describe('MemoryCacheService', () => {
    let cache: MemoryCacheService;

    beforeEach(() => {
        cache = new MemoryCacheService();
    });

    afterEach(() => {
        cache.dispose();
    });

    it('should store and retrieve values', async () => {
        await cache.set('key1', 'value1');
        const value = await cache.get<string>('key1');
        expect(value).toBe('value1');
    });

    it('should return null for missing keys', async () => {
        const value = await cache.get('missing');
        expect(value).toBeNull();
    });

    it('should respect TTL', async () => {
        jest.useFakeTimers();
        await cache.set('key1', 'value1', 1); // 1 second TTL

        jest.advanceTimersByTime(1100);

        const value = await cache.get('key1');
        expect(value).toBeNull();
        jest.useRealTimers();
    });

    it('should delete values', async () => {
        await cache.set('key1', 'value1');
        await cache.del('key1');
        const value = await cache.get('key1');
        expect(value).toBeNull();
    });

    it('should flush cache', async () => {
        await cache.set('key1', 'value1');
        await cache.set('key2', 'value2');
        await cache.flush();
        expect(await cache.get('key1')).toBeNull();
        expect(await cache.get('key2')).toBeNull();
    });

    it('should getOrSet - return cached value if exists', async () => {
        await cache.set('key', 'cached');
        const fetcher = jest.fn().mockResolvedValue('fetched');
        
        const result = await cache.getOrSet('key', fetcher);
        
        expect(result).toBe('cached');
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('should getOrSet - fetch and cache if missing', async () => {
        const fetcher = jest.fn().mockResolvedValue('fetched');
        
        const result = await cache.getOrSet('key', fetcher);
        
        expect(result).toBe('fetched');
        expect(fetcher).toHaveBeenCalled();
        expect(await cache.get('key')).toBe('fetched');
    });
});
