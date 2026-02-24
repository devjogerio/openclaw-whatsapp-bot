import { BaileysClient } from './infrastructure/whatsapp/BaileysClient';
import { logger } from './utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const main = async () => {
    try {
        logger.info('Iniciando OpenClaw WhatsApp Bot...');
        
        const client = new BaileysClient();
        await client.connect();

        // Tratamento de encerramento gracioso
        process.on('SIGINT', async () => {
            logger.info('Encerrando aplicação...');
            await client.disconnect();
            process.exit(0);
        });

    } catch (error) {
        logger.error(error, 'Erro fatal ao iniciar o sistema:');
        process.exit(1);
    }
};

main();
