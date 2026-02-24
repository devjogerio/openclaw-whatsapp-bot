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
    whitelistNumbers: process.env.WHITELIST_NUMBERS ? process.env.WHITELIST_NUMBERS.split(',') : [],
    audioResponseEnabled: process.env.AUDIO_RESPONSE_ENABLED === 'true',
};
