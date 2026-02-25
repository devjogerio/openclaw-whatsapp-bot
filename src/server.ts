import { WahaClient } from './infrastructure/whatsapp/WahaClient';
import { MessageHandler } from './core/handlers/MessageHandler';
import { SQLiteContextManager } from './infrastructure/context/SQLiteContextManager';
import { logger } from './utils/logger';
import { config } from './config/env';

async function bootstrap() {
    try {
        logger.info('Iniciando OpenClaw WhatsApp Bot (via WAHA)...');
        
        // Inicializa o Gerenciador de Contexto Persistente (SQLite)
        const contextManager = new SQLiteContextManager(config.dbPath, config.maxContextMessages);
        logger.info(`Contexto persistente inicializado em: ${config.dbPath}`);

        // Inicializa o Cliente WhatsApp (WAHA)
        const whatsappClient = new WahaClient();
        
        // Inicializa o Handler de Mensagens com contexto persistente
        const messageHandler = new MessageHandler(whatsappClient, contextManager);

        // Conecta o handler ao evento de mensagem
        whatsappClient.onMessage((msg) => messageHandler.handle(msg));

        // Inicia o servidor de Webhook
        await whatsappClient.connect();
        
        logger.info(`Sistema iniciado em ambiente: ${config.nodeEnv}`);

        // Graceful Shutdown
        process.on('SIGINT', async () => {
            logger.info('Encerrando aplicação...');
            await whatsappClient.disconnect();
            process.exit(0);
        });

    } catch (error) {
        logger.error(error, 'Erro fatal ao iniciar o sistema:');
        process.exit(1);
    }
}

bootstrap();
