export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string; // Para function calling
}

export interface IContextManager {
  addMessage(chatId: string, message: ChatMessage): Promise<void>;
  getHistory(chatId: string, limit?: number): Promise<ChatMessage[]>;
  clearHistory(chatId: string): Promise<void>;
}
