
import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    wahaBaseUrl: process.env.WAHA_BASE_URL || 'http://waha:3000',
    wahaApiKey: process.env.WAHA_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3',
    // Configurações da API OpenClaw
    openclawApiKey: process.env.OPENCLAW_API_KEY || '',
    openclawBaseUrl: process.env.OPENCLAW_BASE_URL || 'https://api.openclaw.ai/v1',
    openclawModel: process.env.OPENCLAW_MODEL || 'openclaw-gpt-4',
    // Persistência
    dbPath: process.env.DB_PATH || 'data/context.db',
    maxContextMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES || '50', 10),
    
    // Cache (Redis)
    redisHost: process.env.REDIS_HOST || 'redis',
    redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
    redisPassword: process.env.REDIS_PASSWORD || '',
    cacheTtl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1h

    // Observabilidade
    metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',

    // Segurança e Features
    whitelistNumbers: process.env.WHITELIST_NUMBERS ? process.env.WHITELIST_NUMBERS.split(',') : [],
    audioResponseEnabled: process.env.AUDIO_RESPONSE_ENABLED === 'true',

    // Google Calendar Integration
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',

    // Notion Integration
    notionApiKey: process.env.NOTION_API_KEY || '',
};
