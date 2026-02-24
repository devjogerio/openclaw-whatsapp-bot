import { WahaClient } from '../../../src/infrastructure/whatsapp/WahaClient';
import axios from 'axios';
import express from 'express';

// Mocks
jest.mock('axios');
jest.mock('express', () => {
    const mockApp = {
        use: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        listen: jest.fn((port, callback) => {
            if (callback) callback();
            return { close: jest.fn() };
        }),
    };
    return jest.fn(() => mockApp);
});

describe('WahaClient', () => {
    let client: WahaClient;
    let mockApp: any;

    beforeEach(() => {
        jest.clearAllMocks();
        // @ts-ignore
        mockApp = express(); 
        client = new WahaClient();
    });

    it('should initialize express app on constructor', () => {
        expect(express).toHaveBeenCalled();
        expect(mockApp.use).toHaveBeenCalled(); // body-parser
    });

    it('should start webhook server on connect', async () => {
        await client.connect();
        expect(mockApp.listen).toHaveBeenCalledWith(expect.any(Number), expect.any(Function));
    });

    it('should send text message via API', async () => {
        const to = '5511999999999@c.us';
        const message = 'Hello';
        (axios.post as jest.Mock).mockResolvedValue({ data: { id: 'msg_id' } });

        await client.sendMessage(to, message);

        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/api/sendText'),
            expect.objectContaining({ chatId: to, text: message }),
            expect.any(Object)
        );
    });

    it('should send audio message via API', async () => {
        const to = '5511999999999@c.us';
        const audioBuffer = Buffer.from('audio-data');
        (axios.post as jest.Mock).mockResolvedValue({ data: { id: 'msg_id' } });

        await client.sendAudio(to, audioBuffer);

        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/api/sendVoice'),
            expect.objectContaining({ 
                chatId: to, 
                file: expect.objectContaining({ mimetype: 'audio/mp4' }) 
            }),
            expect.any(Object)
        );
    });

    it('should download media via API', async () => {
        const fileId = 'file_123';
        const fileBuffer = Buffer.from('file-data');
        (axios.get as jest.Mock).mockResolvedValue({ data: fileBuffer });

        const result = await client.downloadMedia(fileId);

        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining(fileId),
            expect.objectContaining({ responseType: 'arraybuffer' })
        );
        expect(result).toEqual(fileBuffer);
    });

    it('should download media from absolute URL', async () => {
        const url = 'http://external/file.jpg';
        const fileBuffer = Buffer.from('file-data');
        (axios.get as jest.Mock).mockResolvedValue({ data: fileBuffer });

        await client.downloadMedia(url);

        expect(axios.get).toHaveBeenCalledWith(
            url,
            expect.objectContaining({ responseType: 'arraybuffer' })
        );
    });
});
