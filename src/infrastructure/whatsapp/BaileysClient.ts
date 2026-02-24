import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    ConnectionState,
    WAProto,
    MessageUpsertType
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { IMessagingClient } from '../../core/interfaces/IMessagingClient';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

export class BaileysClient implements IMessagingClient {
    private sock: any = null;
    private messageCallbacks: ((message: WAProto.IWebMessageInfo) => void)[] = [];

    async connect(): Promise<void> {
        const { state, saveCreds } = await useMultiFileAuthState(config.whatsappSessionPath);

        this.sock = makeWASocket({
            printQRInTerminal: true,
            auth: state,
            logger: logger as any
        });

        this.sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                logger.info('QR Code recebido, escaneie para conectar.');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.warn(`Conexão fechada: ${lastDisconnect?.error}, reconectando: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    this.connect();
                }
            } else if (connection === 'open') {
                logger.info('Conexão com WhatsApp estabelecida com sucesso!');
            }
        });

        this.sock.ev.on('creds.update', saveCreds);

        // Listener centralizado para mensagens
        this.sock.ev.on('messages.upsert', async (m: { messages: WAProto.IWebMessageInfo[], type: MessageUpsertType }) => {
            if (m.type === 'notify' || m.type === 'append') {
                for (const msg of m.messages) {
                    // Ignora mensagens enviadas pelo próprio bot (embora o handler também verifique, é bom filtrar aqui)
                    if (!msg.key.fromMe) {
                        // Dispara todos os callbacks registrados
                        this.messageCallbacks.forEach(callback => {
                            try {
                                callback(msg);
                            } catch (error) {
                                logger.error(error, 'Erro ao executar callback de mensagem');
                            }
                        });
                    }
                }
            }
        });
    }

    async disconnect(): Promise<void> {
        this.sock?.end(undefined);
    }

    /**
     * Registra um callback para ser executado quando uma nova mensagem chegar.
     */
    onMessage(callback: (message: WAProto.IWebMessageInfo) => void): void {
        this.messageCallbacks.push(callback);
    }

    async sendMessage(to: string, message: string): Promise<void> {
        if (!this.sock) {
            throw new Error('Cliente WhatsApp não está conectado.');
        }
        await this.sock.sendMessage(to, { text: message });
    }
}
