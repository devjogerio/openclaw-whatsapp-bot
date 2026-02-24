import { InMemoryContextManager } from '../../../src/infrastructure/context/InMemoryContextManager';
import { ChatMessage } from '../../../src/core/interfaces/IContextManager';

describe('InMemoryContextManager', () => {
    let contextManager: InMemoryContextManager;
    const chatId = 'test-chat-id';

    beforeEach(() => {
        contextManager = new InMemoryContextManager(5); // Limite de 5 mensagens para teste
    });

    it('should add messages to history', async () => {
        const message: ChatMessage = { role: 'user', content: 'Hello' };
        await contextManager.addMessage(chatId, message);
        
        const history = await contextManager.getHistory(chatId);
        expect(history).toHaveLength(1);
        expect(history[0]).toEqual(message);
    });

    it('should respect message limit (FIFO)', async () => {
        for (let i = 1; i <= 6; i++) {
            await contextManager.addMessage(chatId, { role: 'user', content: `Message ${i}` });
        }

        const history = await contextManager.getHistory(chatId);
        expect(history).toHaveLength(5);
        expect(history[0].content).toBe('Message 2'); // A primeira mensagem deve ter sido removida
        expect(history[4].content).toBe('Message 6');
    });

    it('should clear history', async () => {
        await contextManager.addMessage(chatId, { role: 'user', content: 'Hello' });
        await contextManager.clearHistory(chatId);
        
        const history = await contextManager.getHistory(chatId);
        expect(history).toHaveLength(0);
    });

    it('should return empty array for new chat', async () => {
        const history = await contextManager.getHistory('new-chat-id');
        expect(history).toEqual([]);
    });

    it('should return limited history when limit parameter is provided', async () => {
        for (let i = 1; i <= 5; i++) {
            await contextManager.addMessage(chatId, { role: 'user', content: `Message ${i}` });
        }

        const history = await contextManager.getHistory(chatId, 2);
        expect(history).toHaveLength(2);
        expect(history[0].content).toBe('Message 4');
        expect(history[1].content).toBe('Message 5');
    });
});
