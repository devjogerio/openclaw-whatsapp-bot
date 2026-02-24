import { ChatMessage, IContextManager } from '../../core/interfaces/IContextManager';
import { logger } from '../../utils/logger';

export class InMemoryContextManager implements IContextManager {
  private history: Map<string, ChatMessage[]>;
  private readonly maxMessages: number;

  constructor(maxMessages: number = 20) {
    this.history = new Map();
    this.maxMessages = maxMessages;
    logger.info(`[Context] InMemoryContextManager inicializado com limite de ${maxMessages} mensagens.`);
  }

  async addMessage(chatId: string, message: ChatMessage): Promise<void> {
    if (!this.history.has(chatId)) {
      this.history.set(chatId, []);
    }

    const chatHistory = this.history.get(chatId)!;
    chatHistory.push(message);

    // Mantém apenas as últimas N mensagens
    if (chatHistory.length > this.maxMessages) {
      chatHistory.splice(0, chatHistory.length - this.maxMessages);
    }
    
    // Log debug (opcional, pode ser removido em prod)
    // logger.debug(`[Context] Mensagem adicionada para ${chatId}. Total: ${chatHistory.length}`);
  }

  async getHistory(chatId: string, limit?: number): Promise<ChatMessage[]> {
    const history = this.history.get(chatId) || [];
    if (limit && limit < history.length) {
      return history.slice(history.length - limit);
    }
    return [...history]; // Retorna cópia para evitar mutação externa direta
  }

  async clearHistory(chatId: string): Promise<void> {
    this.history.delete(chatId);
    logger.info(`[Context] Histórico limpo para ${chatId}`);
  }
}
