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
});
