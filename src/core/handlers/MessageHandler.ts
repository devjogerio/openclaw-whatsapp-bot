import { IMessagingClient } from '../interfaces/IMessagingClient';
import { SecurityService } from '../services/SecurityService';
import { OpenAIService } from '../../infrastructure/ai/OpenAIService';
import { logger } from '../../utils/logger';
import { proto } from '@whiskeysockets/baileys';

/**
 * Orquestrador central de mensagens.
 * Recebe mensagens do cliente, valida segurança e encaminha para IA.
 */
export class MessageHandler {
    private securityService: SecurityService;
    private aiService: OpenAIService;
    private client: IMessagingClient;

    constructor(client: IMessagingClient) {
        this.client = client;
        this.securityService = new SecurityService();
        this.aiService = new OpenAIService();
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
            
            // Extração simplificada de texto (suporta conversas simples e estendidas)
            // TODO: Suportar áudio e outros tipos de mídia
            const text = message.message?.conversation || 
                         message.message?.extendedTextMessage?.text || 
                         message.message?.imageMessage?.caption ||
                         '';

            if (!text) {
                logger.debug(`Mensagem sem conteúdo de texto recebida de ${remoteJid}`);
                return;
            }

            logger.info(`[${remoteJid}] Mensagem recebida: "${text.substring(0, 50)}..."`);

            // 1. Validação de Segurança (Whitelist)
            if (!this.securityService.isAllowed(remoteJid)) {
                logger.warn(`[SECURITY] Acesso negado para: ${remoteJid}`);
                // Não responder para evitar spam ou detecção, apenas logar
                return;
            }

            // 2. Processamento de IA
            // TODO: Implementar recuperação de histórico de conversa (Contexto)
            logger.info(`[AI] Gerando resposta para ${remoteJid}...`);
            const response = await this.aiService.generateResponse(text);

            // 3. Envio da Resposta
            await this.client.sendMessage(remoteJid, response);
            logger.info(`[AI] Resposta enviada para ${remoteJid}`);

        } catch (error) {
            logger.error(error, 'Erro crítico no processamento da mensagem');
        }
    }
}
