import { WahaClient } from './infrastructure/whatsapp/WahaClient';
import { MessageHandler } from './core/handlers/MessageHandler';
import { SQLiteContextManager } from './infrastructure/context/SQLiteContextManager';
import { OpenClawService } from './infrastructure/ai/OpenClawService';
import { SkillRegistry } from './core/services/SkillRegistry';
import { DateSkill } from './core/skills/DateSkill';
import { WebSearchSkill } from './core/skills/WebSearchSkill';
import { FileSkill } from './core/skills/FileSkill';
import { CommandSkill } from './core/skills/CommandSkill';
import { logger } from './utils/logger';
import { config } from './config/env';

async function bootstrap() {
    try {
        logger.info('Iniciando OpenClaw WhatsApp Bot (via WAHA)...');
        
        // Inicializa o Gerenciador de Contexto Persistente (SQLite)
        const contextManager = new SQLiteContextManager(config.dbPath, config.maxContextMessages);
        logger.info(`Contexto persistente inicializado em: ${config.dbPath}`);

        // Inicializa o Registro de Skills e registra as habilidades
        const skillRegistry = new SkillRegistry();
        skillRegistry.register(new DateSkill());
        skillRegistry.register(new WebSearchSkill());
        skillRegistry.register(new FileSkill());
        skillRegistry.register(new CommandSkill());
        logger.info('Skills registradas com sucesso.');

        // Inicializa o Serviço de IA (OpenClaw como principal)
        const aiService = new OpenClawService(skillRegistry);
        logger.info('Serviço de IA (OpenClaw) inicializado.');

        // Inicializa o Cliente WhatsApp (WAHA)
        const whatsappClient = new WahaClient();
        
        // Inicializa o Handler de Mensagens com injeção de dependências
        const messageHandler = new MessageHandler(whatsappClient, aiService, contextManager);

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
