
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
    // Segurança e Features
    whitelistNumbers: process.env.WHITELIST_NUMBERS ? process.env.WHITELIST_NUMBERS.split(',') : [],
    audioResponseEnabled: process.env.AUDIO_RESPONSE_ENABLED === 'true',
};
