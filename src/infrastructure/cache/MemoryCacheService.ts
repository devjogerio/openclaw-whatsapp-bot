
import { ICacheService } from '../../core/interfaces/ICacheService';
import { logger } from '../../utils/logger';

interface CacheEntry<T> {
    value: T;
    expiry: number;
}

export class MemoryCacheService implements ICacheService {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Limpeza automática a cada 10 minutos
        this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
    }

    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.value as T;
    }

    async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
        this.cache.set(key, {
            value,
            expiry: Date.now() + (ttlSeconds * 1000)
        });
    }

    async del(key: string): Promise<void> {
        this.cache.delete(key);
    }

    async flush(): Promise<void> {
        this.cache.clear();
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiry) {
                this.cache.delete(key);
            }
        }
    }

    dispose() {
        clearInterval(this.cleanupInterval);
    }
}
