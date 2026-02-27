
export interface ICacheService {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    flush(): Promise<void>;
    /**
     * Tenta obter do cache, se não existir, executa o fetcher e armazena o resultado.
     */
    getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T>;
}
