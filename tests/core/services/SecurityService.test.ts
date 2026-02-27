import { SecurityService } from '../../../src/core/services/SecurityService';

// Mock config
jest.mock('../../../src/config/env', () => ({
    config: {
        whitelistNumbers: ['5511999999999', '5511888888888']
    }
}));

describe('SecurityService', () => {
    let securityService: SecurityService;

    beforeEach(() => {
        securityService = new SecurityService();
    });

    it('should allow whitelisted numbers', () => {
        expect(securityService.isAllowed('5511999999999')).toBe(true);
        // Test with suffix
        expect(securityService.isAllowed('5511999999999@s.whatsapp.net')).toBe(true);
    });

    it('should deny non-whitelisted numbers', () => {
        expect(securityService.isAllowed('5511777777777')).toBe(false);
        expect(securityService.isAllowed('123456')).toBe(false);
    });

    it('should handle numbers with special characters if normalization supports it', () => {
        // A implementação atual de normalizeNumber remove caracteres não numéricos
        // Então +55 (11) 99999-9999 vira 5511999999999 que está na whitelist
        expect(securityService.isAllowed('+55 (11) 99999-9999')).toBe(true);
    });

    it('should sanitize input correctly', () => {
        const malicious = '<script>alert(1)</script>Hello';
        // A sanitização simples remove apenas as tags, tornando o script inerte
        expect(securityService.sanitizeInput(malicious)).toBe('alert(1)Hello');
    });

    it('should mask sensitive data', () => {
        expect(securityService.maskSensitiveData('user@example.com')).toBe('us***@example.com');
        expect(securityService.maskSensitiveData('5511999999999')).toBe('****9999');
        // Não deve mascarar sufixo do whatsapp
        // A lógica atual não distingue, então se passar o ID completo, vai mascarar
        // Mas o uso pretendido é para logs de "usuário X"
    });

    it('should enforce rate limits', () => {
        const user = '5511999999999';
        // Simula 10 requisições rápidas
        for (let i = 0; i < 10; i++) {
            expect(securityService.checkRateLimit(user)).toBe(true);
        }
        // A 11ª deve falhar
        expect(securityService.checkRateLimit(user)).toBe(false);
    });
});
