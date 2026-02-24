import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    ConnectionState,
    WAProto,
    MessageUpsertType
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { IMessagingClient } from '../../core/interfaces/IMessagingClient';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

export class BaileysClient implements IMessagingClient {
    private sock: any = null; // Usando any temporariamente para evitar conflitos de tipos complexos do Baileys

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
                logger.warn(`Conexão fechada devido a: ${lastDisconnect?.error}, reconectando: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    this.connect();
                }
            } else if (connection === 'open') {
                logger.info('Conexão com WhatsApp estabelecida com sucesso!');
            }
        });

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('messages.upsert', async (m: { messages: WAProto.IWebMessageInfo[], type: MessageUpsertType }) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    if (!msg.key.fromMe) {
                        logger.info(`Nova mensagem recebida de ${msg.key.remoteJid}`);
                        // Aqui emitiremos o evento para o handler
                    }
                }
            }
        });
    }

    async disconnect(): Promise<void> {
        this.sock?.end(undefined);
    }

    onMessage(callback: (message: any) => void): void {
        // Implementação simplificada para este estágio
        if (this.sock) {
            this.sock.ev.on('messages.upsert', (m: { messages: WAProto.IWebMessageInfo[], type: MessageUpsertType }) => {
                 if (m.type === 'notify') {
                    m.messages.forEach((msg: WAProto.IWebMessageInfo) => {
                        if(!msg.key.fromMe) callback(msg);
                    });
                 }
            });
        }
    }

    async sendMessage(to: string, message: string): Promise<void> {
        if (!this.sock) {
            throw new Error('Cliente WhatsApp não está conectado.');
        }
        await this.sock.sendMessage(to, { text: message });
    }
}
