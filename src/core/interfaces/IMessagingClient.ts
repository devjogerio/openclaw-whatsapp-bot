export interface IMessagingClient {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    onMessage(callback: (message: any) => void): void;
    sendMessage(to: string, message: string): Promise<void>;
    sendAudio(to: string, audioBuffer: Buffer): Promise<void>;
}
