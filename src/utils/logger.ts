import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: isDevelopment ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        }
    } : undefined,
    base: {
        env: process.env.NODE_ENV || 'production',
        service: 'openclaw-bot',
    },
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});
