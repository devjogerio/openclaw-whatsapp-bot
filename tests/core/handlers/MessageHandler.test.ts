import { MessageHandler } from '../../../src/core/handlers/MessageHandler';
import { IMessagingClient } from '../../../src/core/interfaces/IMessagingClient';
import { SecurityService } from '../../../src/core/services/SecurityService';
import { IAIService } from '../../../src/core/interfaces/IAIService';
import { IContextManager } from '../../../src/core/interfaces/IContextManager';

// Mocks
jest.mock('../../../src/core/services/SecurityService');
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }
}));

jest.mock('../../../src/config/env', () => ({
    config: {
        audioResponseEnabled: true,
        whitelistNumbers: ['5511999999999']
    }
}));

describe('MessageHandler', () => {
    let messageHandler: MessageHandler;
    let mockClient: jest.Mocked<IMessagingClient>;
    let mockSecurityService: jest.Mocked<SecurityService>;
    let mockAiService: jest.Mocked<IAIService>;
    let mockContextManager: jest.Mocked<IContextManager>;

    beforeEach(() => {
        // Setup Mocks
        mockClient = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            onMessage: jest.fn(),
            sendMessage: jest.fn(),
            sendAudio: jest.fn(),
            downloadMedia: jest.fn(),
        } as any;

        mockContextManager = {
            addMessage: jest.fn(),
            getHistory: jest.fn().mockResolvedValue([]),
            clearHistory: jest.fn(),
        };

        mockAiService = {
            generateResponse: jest.fn(),
            transcribeAudio: jest.fn(),
            generateAudio: jest.fn(),
        };

        // Clear mocks instances
        (SecurityService as jest.Mock).mockClear();

        messageHandler = new MessageHandler(mockClient, mockAiService, mockContextManager);

        // Access the mocked instances created inside the constructor
        // @ts-ignore
        mockSecurityService = SecurityService.mock.instances[0];
    });

    const createMockMessage = (remoteJid: string, text: string, fromMe: boolean = false) => ({
        id: 'msg_id',
        from: remoteJid,
        to: 'me',
        body: text,
        fromMe: fromMe,
        hasMedia: false,
        timestamp: 1234567890
    });

    it('should process valid message from allowed number', async () => {
        const remoteJid = '5511999999999@c.us';
        const text = 'Hello AI';
        const responseText = 'Hello Human';

        mockSecurityService.isAllowed.mockReturnValue(true);
        (mockAiService.generateResponse as jest.Mock).mockResolvedValue(responseText);

        await messageHandler.handle(createMockMessage(remoteJid, text));

        expect(mockSecurityService.isAllowed).toHaveBeenCalledWith(remoteJid);
        expect(mockContextManager.getHistory).toHaveBeenCalledWith(remoteJid);
        expect(mockAiService.generateResponse).toHaveBeenCalledWith(text, [], undefined);
        expect(mockClient.sendMessage).toHaveBeenCalledWith(remoteJid, responseText);
        expect(mockContextManager.addMessage).toHaveBeenCalledTimes(2); // User + Assistant
    });

    it('should ignore messages from self (fromMe=true)', async () => {
        const msg = createMockMessage('any', 'text', true);
        await messageHandler.handle(msg);
        expect(mockSecurityService.isAllowed).not.toHaveBeenCalled();
    });

    it('should ignore unauthorized numbers', async () => {
        const remoteJid = '5511000000000@c.us';
        mockSecurityService.isAllowed.mockReturnValue(false);

        await messageHandler.handle(createMockMessage(remoteJid, 'hi'));

        expect(mockSecurityService.isAllowed).toHaveBeenCalledWith(remoteJid);
        expect(mockAiService.generateResponse).not.toHaveBeenCalled();
    });

    it('should handle messages without body gracefully', async () => {
        const msg = { from: '5511999999999@c.us', hasMedia: false }; // No body
        mockSecurityService.isAllowed.mockReturnValue(true);

        await messageHandler.handle(msg);
        expect(mockAiService.generateResponse).not.toHaveBeenCalled();
    });

    it('should handle image messages and download media', async () => {
        const remoteJid = '5511999999999@c.us';
        const msg = {
            from: remoteJid,
            body: 'Legenda da foto',
            hasMedia: true,
            type: 'image',
            mediaUrl: 'http://waha/media/123.jpg'
        };
        const buffer = Buffer.from('fake-image-data');
        
        mockSecurityService.isAllowed.mockReturnValue(true);
        // @ts-ignore
        mockClient.downloadMedia.mockResolvedValue(buffer);
        mockAiService.generateResponse.mockResolvedValue('Analisei a imagem');

        await messageHandler.handle(msg);

        expect(mockClient.downloadMedia).toHaveBeenCalledWith(msg.mediaUrl);
        expect(mockAiService.generateResponse).toHaveBeenCalledWith(
            msg.body, 
            expect.any(Array), 
            expect.stringContaining('data:image/jpeg;base64,')
        );
    });
});
