import { IMessagingClient } from '../interfaces/IMessagingClient';
import { SecurityService } from '../services/SecurityService';
import { IAIService } from '../interfaces/IAIService';
import { logger } from '../../utils/logger';
import { IContextManager } from '../interfaces/IContextManager';
import { InMemoryContextManager } from '../../infrastructure/context/InMemoryContextManager';
import { config } from '../../config/env';

/**
 * Orquestrador central de mensagens.
 * Recebe mensagens do cliente (WAHA), valida segurança e encaminha para IA.
 */
export class MessageHandler {
    private securityService: SecurityService;
    private aiService: IAIService;
    private client: IMessagingClient;
    private contextManager: IContextManager;

    constructor(
        client: IMessagingClient, 
        aiService: IAIService, 
        contextManager?: IContextManager
    ) {
        this.client = client;
        this.aiService = aiService;
        this.securityService = new SecurityService();
        this.contextManager = contextManager || new InMemoryContextManager();
    }

    /**
     * Processa uma mensagem recebida.
     * @param message Payload de mensagem do WAHA.
     */
    public async handle(message: any): Promise<void> {
        try {
            // Verifica estrutura básica
            if (!message.from || !message.body) {
                // Mensagens de sistema ou status podem não ter body
                return;
            }

            // Ignora mensagens enviadas pelo próprio bot
            if (message.fromMe) return;

            const remoteJid = message.from;
            
            // 1. Validação de Segurança (Whitelist)
            if (!this.securityService.isAllowed(remoteJid)) {
                logger.warn(`[SECURITY] Acesso negado para: ${remoteJid}`);
                return;
            }

            let text = message.body;
            let imageUrl: string | undefined;

            if (message.hasMedia) {
                logger.info(`[${remoteJid}] Mensagem com mídia recebida. Tipo: ${message.type}`);
                
                // Tenta baixar a mídia se houver URL e o cliente suportar
                if (message.mediaUrl && this.client.downloadMedia) {
                    try {
                        logger.info(`[${remoteJid}] Baixando mídia de: ${message.mediaUrl}`);
                        const buffer = await this.client.downloadMedia(message.mediaUrl);
                        
                        if (message.type === 'image') {
                            const base64Media = buffer.toString('base64');
                            // Assume JPEG por padrão para simplificar, mas ideal seria detectar mime-type
                            imageUrl = `data:image/jpeg;base64,${base64Media}`;
                            logger.info(`[${remoteJid}] Imagem processada para envio à IA.`);
                        } else if (message.type === 'ptt' || message.type === 'audio') {
                            logger.info(`[${remoteJid}] Áudio recebido (${buffer.length} bytes). Transcrição ainda não implementada.`);
                            await this.client.sendMessage(remoteJid, 'Recebi seu áudio. O sistema de transcrição está em desenvolvimento.');
                            return;
                        }
                    } catch (err) {
                        logger.error(`[${remoteJid}] Falha ao baixar mídia: ${err}`);
                        await this.client.sendMessage(remoteJid, 'Tive um problema ao baixar a mídia que você enviou.');
                        return;
                    }
                } else {
                    logger.warn(`[${remoteJid}] Mídia recebida sem URL de download ou suporte do cliente.`);
                    if (message.type === 'ptt' || message.type === 'audio') {
                         await this.client.sendMessage(remoteJid, 'Recebi um áudio, mas não consegui processá-lo.');
                         return;
                    }
                }
            }

            if (!text && !message.hasMedia) {
                logger.debug(`Mensagem sem conteúdo processável recebida de ${remoteJid}`);
                return;
            }

            logger.info(`[${remoteJid}] Processando: "${text.substring(0, 50)}..."`);

            // 2. Processamento de IA
            // Recupera histórico de conversas
            const history = await this.contextManager.getHistory(remoteJid);
            logger.info(`[AI] Contexto recuperado para ${remoteJid}: ${history.length} mensagens.`);

            logger.info(`[AI] Gerando resposta para ${remoteJid}...`);
            const response = await this.aiService.generateResponse(text, history, imageUrl);

            // Salva a interação no histórico
            const userContent = imageUrl ? `[Imagem enviada] ${text}` : text;
            await this.contextManager.addMessage(remoteJid, { role: 'user', content: userContent });
            await this.contextManager.addMessage(remoteJid, { role: 'assistant', content: response });

            // 3. Envio da Resposta
            await this.client.sendMessage(remoteJid, response);
            logger.info(`[AI] Resposta enviada para ${remoteJid}`);

            // Enviar áudio de volta se a mensagem original foi áudio e estiver habilitado
            // (Requer implementação de envio de áudio no WahaClient e detecção de tipo de msg)
            if ((message.type === 'ptt' || message.type === 'audio') && config.audioResponseEnabled) {
                 // Pendente: Implementar lógica de áudio reverso com WAHA
            }

        } catch (error) {
            logger.error(error, 'Erro crítico no processamento da mensagem');
        }
    }
}
