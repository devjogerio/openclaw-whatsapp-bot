import { MessageHandler } from '../../../src/core/handlers/MessageHandler';
import { IMessagingClient } from '../../../src/core/interfaces/IMessagingClient';
import { SecurityService } from '../../../src/core/services/SecurityService';
import { OpenAIService } from '../../../src/infrastructure/ai/OpenAIService';
import { proto } from '@whiskeysockets/baileys';

// Mocks
jest.mock('../../../src/core/services/SecurityService');
jest.mock('../../../src/infrastructure/ai/OpenAIService');
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }
}));

describe('MessageHandler', () => {
    let messageHandler: MessageHandler;
    let mockClient: jest.Mocked<IMessagingClient>;
    let mockSecurityService: jest.Mocked<SecurityService>;
    let mockAiService: jest.Mocked<OpenAIService>;

    beforeEach(() => {
        // Setup Mocks
        mockClient = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            onMessage: jest.fn(),
            sendMessage: jest.fn(),
        };

        // Clear mocks instances
        (SecurityService as jest.Mock).mockClear();
        (OpenAIService as jest.Mock).mockClear();

        messageHandler = new MessageHandler(mockClient);

        // Access the mocked instances created inside the constructor
        // This is a bit tricky with private properties, but since we are mocking the module,
        // we can spy on the prototype or just assume the mock implementation is used.
        // A cleaner way is to inject dependencies, but for now we follow the existing code.
        mockSecurityService = (SecurityService as any).mock.instances[0];
        mockAiService = (OpenAIService as any).mock.instances[0];
    });

    const createMockMessage = (remoteJid: string, text: string, fromMe: boolean = false): proto.IWebMessageInfo => ({
        key: { remoteJid, fromMe },
        message: { conversation: text }
    });

    it('should process valid message from allowed number', async () => {
        const remoteJid = '5511999999999@s.whatsapp.net';
        const text = 'Hello AI';
        const responseText = 'Hello Human';

        mockSecurityService.isAllowed.mockReturnValue(true);
        mockAiService.generateResponse.mockResolvedValue(responseText);

        await messageHandler.handle(createMockMessage(remoteJid, text));

        expect(mockSecurityService.isAllowed).toHaveBeenCalledWith(remoteJid);
        expect(mockAiService.generateResponse).toHaveBeenCalledWith(text);
        expect(mockClient.sendMessage).toHaveBeenCalledWith(remoteJid, responseText);
    });

    it('should ignore messages from self (fromMe=true)', async () => {
        const msg = createMockMessage('any', 'text', true);
        await messageHandler.handle(msg);
        expect(mockSecurityService.isAllowed).not.toHaveBeenCalled();
    });

    it('should ignore unauthorized numbers', async () => {
        const remoteJid = 'unauthorized@s.whatsapp.net';
        mockSecurityService.isAllowed.mockReturnValue(false);

        await messageHandler.handle(createMockMessage(remoteJid, 'Hello'));

        expect(mockSecurityService.isAllowed).toHaveBeenCalledWith(remoteJid);
        expect(mockAiService.generateResponse).not.toHaveBeenCalled();
        expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle messages without text content gracefully', async () => {
        const msg: proto.IWebMessageInfo = {
            key: { remoteJid: '123', fromMe: false },
            message: { imageMessage: {} } // No caption
        };
        await messageHandler.handle(msg);
        expect(mockAiService.generateResponse).not.toHaveBeenCalled();
    });
});
