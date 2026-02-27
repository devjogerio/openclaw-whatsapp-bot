
import Redis from 'ioredis';
import { ICacheService } from '../../core/interfaces/ICacheService';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';

export class RedisCacheService implements ICacheService {
    private client: Redis;

    constructor() {
        this.client = new Redis({
            host: config.redisHost,
            port: config.redisPort,
            password: config.redisPassword || undefined,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            lazyConnect: true // Conecta apenas quando necessário
        });

        this.client.on('error', (err) => {
            logger.error(`[Redis] Erro de conexão: ${err.message}`);
        });

        this.client.on('connect', () => {
            logger.info('[Redis] Conectado com sucesso.');
        });
    }

    async connect(): Promise<void> {
        try {
            await this.client.connect();
        } catch (error) {
            // Ignora erro se já estiver conectando/conectado
        }
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const data = await this.client.get(key);
            if (!data) return null;
            return JSON.parse(data) as T;
        } catch (error) {
            logger.error(`[Redis] Erro ao obter chave ${key}: ${error}`);
            return null;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
        try {
            const data = JSON.stringify(value);
            await this.client.set(key, data, 'EX', ttlSeconds);
        } catch (error) {
            logger.error(`[Redis] Erro ao definir chave ${key}: ${error}`);
        }
    }

    async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = 3600): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const value = await fetcher();
        await this.set(key, value, ttlSeconds);
        return value;
    }

    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch (error) {
            logger.error(`[Redis] Erro ao deletar chave ${key}: ${error}`);
        }
    }

    async flush(): Promise<void> {
        try {
            await this.client.flushall();
        } catch (error) {
            logger.error(`[Redis] Erro ao limpar cache: ${error}`);
        }
    }

    async disconnect(): Promise<void> {
        await this.client.quit();
    }
}
