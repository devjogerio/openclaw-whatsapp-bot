import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    whatsappSessionPath: process.env.WHATSAPP_SESSION_PATH || './auth_info_baileys',
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    whitelistNumbers: process.env.WHITELIST_NUMBERS ? process.env.WHITELIST_NUMBERS.split(',') : [],
    audioResponseEnabled: process.env.AUDIO_RESPONSE_ENABLED === 'true',
};
