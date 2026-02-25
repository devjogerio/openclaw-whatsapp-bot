import { SQLiteContextManager } from '../../../src/infrastructure/context/SQLiteContextManager';
import fs from 'fs';
import path from 'path';

describe('SQLiteContextManager', () => {
    const testDbPath = path.join(__dirname, 'test_context.db');
    let contextManager: SQLiteContextManager;

    beforeEach(async () => {
        // Limpa banco de teste anterior se existir
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        contextManager = new SQLiteContextManager(testDbPath, 5); // Limite de 5 mensagens
        // Aguarda inicialização (pequeno delay para garantir que a promise do construtor iniciou)
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(() => {
        if (fs.existsSync(testDbPath)) {
            // fs.unlinkSync(testDbPath); // Comentado para permitir debug se falhar, ou limpar no before
        }
    });

    afterAll(() => {
         if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    it('deve adicionar e recuperar mensagens', async () => {
        const chatId = 'test-chat-1';
        await contextManager.addMessage(chatId, { role: 'user', content: 'Olá' });
        await contextManager.addMessage(chatId, { role: 'assistant', content: 'Oi!' });

        const history = await contextManager.getHistory(chatId);
        expect(history).toHaveLength(2);
        expect(history[0].content).toBe('Olá');
        expect(history[1].content).toBe('Oi!');
    });

    it('deve respeitar o limite máximo de mensagens (pruning)', async () => {
        const chatId = 'test-chat-limit';
        // Adiciona 6 mensagens (limite é 5)
        for (let i = 1; i <= 6; i++) {
            await contextManager.addMessage(chatId, { role: 'user', content: `Msg ${i}` });
        }

        const history = await contextManager.getHistory(chatId);
        expect(history).toHaveLength(5);
        expect(history[0].content).toBe('Msg 2'); // A primeira (Msg 1) deve ter sido removida
        expect(history[4].content).toBe('Msg 6');
    });

    it('deve limpar o histórico', async () => {
        const chatId = 'test-chat-clear';
        await contextManager.addMessage(chatId, { role: 'user', content: 'Teste' });
        
        await contextManager.clearHistory(chatId);
        const history = await contextManager.getHistory(chatId);
        expect(history).toHaveLength(0);
    });

    it('deve separar históricos de chats diferentes', async () => {
        await contextManager.addMessage('chat-a', { role: 'user', content: 'A' });
        await contextManager.addMessage('chat-b', { role: 'user', content: 'B' });

        const historyA = await contextManager.getHistory('chat-a');
        const historyB = await contextManager.getHistory('chat-b');

        expect(historyA).toHaveLength(1);
        expect(historyA[0].content).toBe('A');
        expect(historyB).toHaveLength(1);
        expect(historyB[0].content).toBe('B');
    });
});
