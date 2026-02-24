import { BaileysClient } from './infrastructure/whatsapp/BaileysClient';
import { MessageHandler } from './core/handlers/MessageHandler';
import { logger } from './utils/logger';
import { config } from './config/env';

async function bootstrap() {
    try {
        logger.info('Iniciando OpenClaw WhatsApp Bot...');
        
        // Inicializa o Cliente WhatsApp
        const whatsappClient = new BaileysClient();
        
        // Inicializa o Handler de Mensagens
        const messageHandler = new MessageHandler(whatsappClient);

        // Conecta o handler ao evento de mensagem
        whatsappClient.onMessage((msg) => messageHandler.handle(msg));

        // Inicia a conexão
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
