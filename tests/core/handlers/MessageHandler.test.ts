import { MessageHandler } from '../../../src/core/handlers/MessageHandler';
import { IMessagingClient } from '../../../src/core/interfaces/IMessagingClient';
import { SecurityService } from '../../../src/core/services/SecurityService';
import { OpenAIService } from '../../../src/infrastructure/ai/OpenAIService';
import { proto } from '@whiskeysockets/baileys';
import { IContextManager } from '../../../src/core/interfaces/IContextManager';

// Mocks
jest.mock('../../../src/core/services/SecurityService');
jest.mock('../../../src/infrastructure/ai/OpenAIService');
jest.mock('@whiskeysockets/baileys', () => ({
    proto: {},
    downloadMediaMessage: jest.fn().mockResolvedValue(Buffer.from('audio_content'))
}));
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
    let mockAiService: jest.Mocked<OpenAIService>;
    let mockContextManager: jest.Mocked<IContextManager>;

    beforeEach(() => {
        // Setup Mocks
        mockClient = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            onMessage: jest.fn(),
            sendMessage: jest.fn(),
            sendAudio: jest.fn(),
        };

        mockContextManager = {
            addMessage: jest.fn(),
            getHistory: jest.fn().mockResolvedValue([]),
            clearHistory: jest.fn(),
        };

        // Clear mocks instances
        (SecurityService as jest.Mock).mockClear();
        (OpenAIService as jest.Mock).mockClear();

        messageHandler = new MessageHandler(mockClient, mockContextManager);

        // Access the mocked instances created inside the constructor
        mockSecurityService = (SecurityService as any).mock.instances[0];
        mockAiService = (OpenAIService as any).mock.instances[0];
    });

    const createMockMessage = (remoteJid: string, text: string, fromMe: boolean = false): proto.IWebMessageInfo => ({
        key: { remoteJid, fromMe },
        message: { conversation: text }
    });

    const createAudioMessage = (remoteJid: string): proto.IWebMessageInfo => ({
        key: { remoteJid, fromMe: false },
        message: { 
            audioMessage: { url: 'http://audio.url' } 
        }
    });

    it('should process valid message from allowed number', async () => {
        const remoteJid = '5511999999999@s.whatsapp.net';
        const text = 'Hello AI';
        const responseText = 'Hello Human';

        mockSecurityService.isAllowed.mockReturnValue(true);
        mockAiService.generateResponse.mockResolvedValue(responseText);

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
        const remoteJid = 'unauthorized@s.whatsapp.net';
        mockSecurityService.isAllowed.mockReturnValue(false);

        await messageHandler.handle(createMockMessage(remoteJid, 'Hello'));

        expect(mockSecurityService.isAllowed).toHaveBeenCalledWith(remoteJid);
        expect(mockAiService.generateResponse).not.toHaveBeenCalled();
        expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle truly empty/unsupported messages gracefully', async () => {
        const msg: proto.IWebMessageInfo = {
            key: { remoteJid: '123', fromMe: false },
            message: { stickerMessage: {} } // Unsupported type
        };
        mockSecurityService.isAllowed.mockReturnValue(true);
        
        await messageHandler.handle(msg);
        expect(mockAiService.generateResponse).not.toHaveBeenCalled();
    });

    it('should process audio message', async () => {
        const remoteJid = '5511999999999@s.whatsapp.net';
        const transcription = 'Transcribed text';
        const responseText = 'Response to audio';
        const audioBuffer = Buffer.from('audio_response');

        mockSecurityService.isAllowed.mockReturnValue(true);
        mockAiService.transcribeAudio.mockResolvedValue(transcription);
        mockAiService.generateResponse.mockResolvedValue(responseText);
        mockAiService.generateAudio.mockResolvedValue(audioBuffer);

        await messageHandler.handle(createAudioMessage(remoteJid));

        expect(mockAiService.transcribeAudio).toHaveBeenCalled();
        expect(mockAiService.generateResponse).toHaveBeenCalledWith(transcription, [], undefined);
        expect(mockClient.sendMessage).toHaveBeenCalledWith(remoteJid, responseText);
        expect(mockAiService.generateAudio).toHaveBeenCalledWith(responseText);
        expect(mockClient.sendAudio).toHaveBeenCalledWith(remoteJid, audioBuffer);
    });

    it('should process image message', async () => {
        const remoteJid = '5511999999999@s.whatsapp.net';
        const imageBuffer = Buffer.from('image_content');
        const base64Image = imageBuffer.toString('base64');
        const expectedImageUrl = `data:image/jpeg;base64,${base64Image}`;
        const caption = 'Analyze this';
        const responseText = 'Image Analysis';

        const msg: proto.IWebMessageInfo = {
            key: { remoteJid, fromMe: false },
            message: { 
                imageMessage: { 
                    caption: caption,
                    mimetype: 'image/jpeg'
                } 
            }
        };

        // Mock downloadMediaMessage for this test case specifically if needed, 
        // but the global mock returns 'audio_content'. Let's override or assume it returns buffer.
        const { downloadMediaMessage } = require('@whiskeysockets/baileys');
        (downloadMediaMessage as jest.Mock).mockResolvedValue(imageBuffer);

        mockSecurityService.isAllowed.mockReturnValue(true);
        mockAiService.generateResponse.mockResolvedValue(responseText);

        await messageHandler.handle(msg);

        expect(downloadMediaMessage).toHaveBeenCalled();
        expect(mockAiService.generateResponse).toHaveBeenCalledWith(caption, [], expectedImageUrl);
        expect(mockClient.sendMessage).toHaveBeenCalledWith(remoteJid, responseText);
    });

    it('should process image message without caption using default prompt', async () => {
        const remoteJid = '5511999999999@s.whatsapp.net';
        const imageBuffer = Buffer.from('image_content');
        const base64Image = imageBuffer.toString('base64');
        const expectedImageUrl = `data:image/jpeg;base64,${base64Image}`;
        const defaultPrompt = "O que você vê nesta imagem?";
        const responseText = 'Image Description';

        const msg: proto.IWebMessageInfo = {
            key: { remoteJid, fromMe: false },
            message: { 
                imageMessage: { 
                    mimetype: 'image/jpeg'
                } 
            }
        };

        const { downloadMediaMessage } = require('@whiskeysockets/baileys');
        (downloadMediaMessage as jest.Mock).mockResolvedValue(imageBuffer);

        mockSecurityService.isAllowed.mockReturnValue(true);
        mockAiService.generateResponse.mockResolvedValue(responseText);

        await messageHandler.handle(msg);

        expect(mockAiService.generateResponse).toHaveBeenCalledWith(defaultPrompt, [], expectedImageUrl);
        expect(mockClient.sendMessage).toHaveBeenCalledWith(remoteJid, responseText);
    });
});
