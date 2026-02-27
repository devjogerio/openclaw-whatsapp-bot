import axios from 'axios';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { IMessagingClient } from '../../core/interfaces/IMessagingClient';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';

/**
 * Cliente para integração com a API WAHA (WhatsApp HTTP API).
 * Substitui a biblioteca Baileys.
 */
export class WahaClient implements IMessagingClient {
    private app: express.Application;
    private server: any;
    private messageCallbacks: ((message: any) => void)[] = [];
    private baseUrl: string;
    private apiKey: string;
    private webhookPort: number;

    constructor() {
        this.baseUrl = process.env.WAHA_BASE_URL || 'http://waha:3000';
        this.apiKey = process.env.WAHA_API_KEY || '';
        this.webhookPort = parseInt(process.env.PORT || '3000', 10);
        
        this.app = express();
        this.app.use(bodyParser.json({ limit: '50mb' }));
        this.setupRoutes();
    }

    private setupRoutes() {
        // Rota de Health Check
        this.app.get('/health', (req: Request, res: Response) => {
            res.status(200).send('OK');
        });

        // Rota de Webhook para receber eventos do WAHA
        this.app.post('/webhook', (req: Request, res: Response) => {
            try {
                const event = req.body;
                
                // Verifica se é um evento de mensagem
                if (event.event === 'message' || event.event === 'message.any') {
                    const message = event.payload;
                    
                    // Dispara callbacks
                    this.messageCallbacks.forEach(callback => {
                        try {
                            callback(message);
                        } catch (err) {
                            logger.error(err, 'Erro no callback de mensagem WAHA');
                        }
                    });
                } else if (event.event === 'session.status') {
                    logger.info(`Status da sessão WAHA: ${event.payload.status}`);
                }

                res.status(200).send('OK');
            } catch (error) {
                logger.error(error, 'Erro ao processar webhook WAHA');
                res.status(500).send('Erro interno');
            }
        });
    }

    async connect(): Promise<void> {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.webhookPort, () => {
                logger.info(`Servidor de Webhook iniciado na porta ${this.webhookPort}`);
                logger.info(`Conectado ao WAHA em: ${this.baseUrl}`);
                resolve();
            });
        });
    }

    async disconnect(): Promise<void> {
        if (this.server) {
            this.server.close();
            logger.info('Servidor de Webhook encerrado.');
        }
    }

    onMessage(callback: (message: any) => void): void {
        this.messageCallbacks.push(callback);
    }

    async sendMessage(to: string, message: string): Promise<void> {
        return this.executeWithRetry(async () => {
            await axios.post(`${this.baseUrl}/api/sendText`, {
                chatId: to,
                text: message,
                session: 'default'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': this.apiKey
                }
            });
        });
    }

    async setTypingState(to: string, state: boolean): Promise<void> {
        try {
            await axios.post(`${this.baseUrl}/api/${state ? 'startTyping' : 'stopTyping'}`, {
                chatId: to,
                session: 'default'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': this.apiKey
                }
            });
        } catch (error: any) {
            logger.warn(`[WAHA] Erro ao definir estado typing: ${error.message}`);
        }
    }

    async sendAudio(to: string, audioBuffer: Buffer): Promise<void> {
        return this.executeWithRetry(async () => {
            // WAHA espera base64 para arquivos ou URL
            const base64Audio = audioBuffer.toString('base64');
            const dataUrl = `data:audio/mp4;base64,${base64Audio}`;

            await axios.post(`${this.baseUrl}/api/sendVoice`, {
                chatId: to,
                file: {
                    mimetype: 'audio/mp4',
                    data: dataUrl,
                    filename: 'voice.mp4'
                },
                session: 'default'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': this.apiKey
                }
            });
        });
    }

    async downloadMedia(fileId: string): Promise<Buffer> {
        return this.executeWithRetry(async () => {
            const fileUrl = fileId.startsWith('http') ? fileId : `${this.baseUrl}/api/files/${fileId}`;
            
            const response = await axios.get(fileUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'X-Api-Key': this.apiKey
                }
            });
            
            return Buffer.from(response.data);
        });
    }

    private async executeWithRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
        let lastError: any;
        for (let i = 0; i < retries; i++) {
            try {
                return await operation();
            } catch (error: any) {
                lastError = error;
                const status = error.response?.status;
                
                // Não retenta erros de cliente (4xx)
                if (status && status >= 400 && status < 500) {
                    logger.error(`[WAHA] Erro de cliente (${status}): ${error.message}`);
                    throw error;
                }

                logger.warn(`[WAHA] Erro na tentativa ${i + 1}/${retries}: ${error.message}`);
                await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i)));
            }
        }
        logger.error(`[WAHA] Falha após ${retries} tentativas: ${lastError.message}`);
        throw lastError;
    }
}
