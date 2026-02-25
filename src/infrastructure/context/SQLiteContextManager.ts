import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { ChatMessage, IContextManager } from '../../core/interfaces/IContextManager';
import { logger } from '../../utils/logger';
import path from 'path';
import fs from 'fs';

export class SQLiteContextManager implements IContextManager {
    private dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>>;
    private readonly maxMessages: number;

    constructor(dbPath: string = 'data/context.db', maxMessages: number = 50) {
        this.maxMessages = maxMessages;
        
        // Garante que o diretório de dados existe
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.dbPromise = this.initDatabase(dbPath);
    }

    private async initDatabase(dbPath: string): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
        try {
            const db = await open({
                filename: dbPath,
                driver: sqlite3.Database
            });

            await db.exec(`
                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    name TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_chat_id ON chat_history(chat_id);
                CREATE INDEX IF NOT EXISTS idx_timestamp ON chat_history(timestamp);
            `);

            logger.info(`[Context] SQLiteContextManager inicializado em ${dbPath}`);
            return db;
        } catch (error) {
            logger.error(`[Context] Erro ao inicializar banco de dados: ${error}`);
            throw error;
        }
    }

    async addMessage(chatId: string, message: ChatMessage): Promise<void> {
        try {
            const db = await this.dbPromise;
            
            await db.run(
                'INSERT INTO chat_history (chat_id, role, content, name) VALUES (?, ?, ?, ?)',
                [chatId, message.role, message.content, message.name || null]
            );

            // Manutenção: Limpar mensagens antigas se exceder o limite
            // Isso pode ser otimizado para não rodar a cada inserção se a performance for crítica
            await this.pruneHistory(chatId);
            
        } catch (error) {
            logger.error(`[Context] Erro ao adicionar mensagem para ${chatId}: ${error}`);
        }
    }

    private async pruneHistory(chatId: string): Promise<void> {
        const db = await this.dbPromise;
        const countResult = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM chat_history WHERE chat_id = ?', chatId);
        
        if (countResult && countResult.count > this.maxMessages) {
            // Remove as mensagens mais antigas mantendo apenas as últimas N
            const keepCount = this.maxMessages;
            await db.run(`
                DELETE FROM chat_history 
                WHERE id IN (
                    SELECT id FROM chat_history 
                    WHERE chat_id = ? 
                    ORDER BY id DESC 
                    LIMIT -1 OFFSET ?
                )
            `, [chatId, keepCount]);
        }
    }

    async getHistory(chatId: string, limit?: number): Promise<ChatMessage[]> {
        try {
            const db = await this.dbPromise;
            const finalLimit = limit || this.maxMessages;

            // Busca as mensagens mais recentes (ordenadas por ID DESC para pegar as últimas)
            // Usamos ID em vez de timestamp para garantir ordem correta mesmo em inserções rápidas
            const rows = await db.all<any[]>(`
                SELECT role, content, name 
                FROM chat_history 
                WHERE chat_id = ? 
                ORDER BY id DESC 
                LIMIT ?
            `, [chatId, finalLimit]);

            // Reverte para ordem cronológica (mais antigas primeiro)
            return rows.reverse().map(row => ({
                role: row.role as 'system' | 'user' | 'assistant' | 'function',
                content: row.content,
                name: row.name || undefined
            }));

        } catch (error) {
            logger.error(`[Context] Erro ao recuperar histórico para ${chatId}: ${error}`);
            return [];
        }
    }

    async clearHistory(chatId: string): Promise<void> {
        try {
            const db = await this.dbPromise;
            await db.run('DELETE FROM chat_history WHERE chat_id = ?', chatId);
            logger.info(`[Context] Histórico limpo para ${chatId}`);
        } catch (error) {
            logger.error(`[Context] Erro ao limpar histórico para ${chatId}: ${error}`);
        }
    }
}
