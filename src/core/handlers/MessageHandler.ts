import { IMessagingClient } from '../interfaces/IMessagingClient';
import { SecurityService } from '../services/SecurityService';
import { OpenAIService } from '../../infrastructure/ai/OpenAIService';
import { logger } from '../../utils/logger';
import { proto, downloadMediaMessage } from '@whiskeysockets/baileys';
import { SkillRegistry } from '../services/SkillRegistry';
import { DateSkill } from '../skills/DateSkill';
import { WebSearchSkill } from '../skills/WebSearchSkill';
import { FileSkill } from '../skills/FileSkill';
import { IContextManager } from '../interfaces/IContextManager';
import { InMemoryContextManager } from '../../infrastructure/context/InMemoryContextManager';

/**
 * Orquestrador central de mensagens.
 * Recebe mensagens do cliente, valida segurança e encaminha para IA.
 */
export class MessageHandler {
    private securityService: SecurityService;
    private aiService: OpenAIService;
    private client: IMessagingClient;
    private skillRegistry: SkillRegistry;
    private contextManager: IContextManager;

    constructor(client: IMessagingClient, contextManager?: IContextManager) {
        this.client = client;
        this.securityService = new SecurityService();
        this.contextManager = contextManager || new InMemoryContextManager();
        
        // Inicializa registro de skills
        this.skillRegistry = new SkillRegistry();
        this.registerSkills();

        // Injeta registro de skills no serviço de IA
        this.aiService = new OpenAIService(this.skillRegistry);
    }

    /**
     * Registra as skills disponíveis no sistema.
     */
    private registerSkills(): void {
        this.skillRegistry.register(new DateSkill());
        this.skillRegistry.register(new WebSearchSkill());
        this.skillRegistry.register(new FileSkill());
        // Futuras skills serão registradas aqui
    }

    /**
     * Processa uma mensagem recebida.
     * @param message Objeto de mensagem do Baileys.
     */
    public async handle(message: proto.IWebMessageInfo): Promise<void> {
        try {
            // Ignora mensagens enviadas pelo próprio bot ou sem remoteJid
            if (message.key.fromMe || !message.key.remoteJid) return;

            const remoteJid = message.key.remoteJid;
            
            // 1. Validação de Segurança (Whitelist)
            if (!this.securityService.isAllowed(remoteJid)) {
                logger.warn(`[SECURITY] Acesso negado para: ${remoteJid}`);
                return;
            }

            let text = message.message?.conversation || 
                       message.message?.extendedTextMessage?.text || 
                       message.message?.imageMessage?.caption ||
                       '';

            // Tratamento de Áudio
            const audioMessage = message.message?.audioMessage;
            if (audioMessage) {
                logger.info(`[${remoteJid}] Áudio recebido. Iniciando download e transcrição...`);
                try {
                    const buffer = await downloadMediaMessage(
                        message,
                        'buffer',
                        { },
                        { 
                            logger: logger as any, // Cast necessário pois pino != Baileys logger
                            reuploadRequest: async () => { return new Promise(() => {}) } // Mock simples
                        } 
                    );
                    
                    text = await this.aiService.transcribeAudio(buffer as Buffer);
                    logger.info(`[${remoteJid}] Texto transcrito: "${text}"`);
                } catch (err) {
                    logger.error(err, 'Falha ao processar áudio');
                    await this.client.sendMessage(remoteJid, 'Desculpe, não consegui ouvir seu áudio.');
                    return;
                }
            }

            if (!text) {
                logger.debug(`Mensagem sem conteúdo processável recebida de ${remoteJid}`);
                return;
            }

            logger.info(`[${remoteJid}] Processando: "${text.substring(0, 50)}..."`);

            // 2. Processamento de IA
            // Recupera histórico de conversas
            const history = await this.contextManager.getHistory(remoteJid);
            logger.info(`[AI] Contexto recuperado para ${remoteJid}: ${history.length} mensagens.`);

            logger.info(`[AI] Gerando resposta para ${remoteJid}...`);
            const response = await this.aiService.generateResponse(text, history);

            // Salva a interação no histórico
            await this.contextManager.addMessage(remoteJid, { role: 'user', content: text });
            await this.contextManager.addMessage(remoteJid, { role: 'assistant', content: response });

            // 3. Envio da Resposta
            await this.client.sendMessage(remoteJid, response);
            logger.info(`[AI] Resposta enviada para ${remoteJid}`);

            // Enviar áudio de volta se a mensagem original foi áudio
            if (audioMessage) {
                try {
                    const audioResponse = await this.aiService.generateAudio(response);
                    await this.client.sendAudio(remoteJid, audioResponse);
                    logger.info(`[AI] Áudio de resposta enviado para ${remoteJid}`);
                } catch (error) {
                    logger.error(error, 'Erro ao gerar/enviar áudio de resposta');
                }
            }

        } catch (error) {
            logger.error(error, 'Erro crítico no processamento da mensagem');
        }
    }
}
