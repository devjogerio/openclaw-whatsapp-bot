
import { logger } from '../../src/utils/logger';

describe('Logger', () => {
    it('should be defined', () => {
        expect(logger).toBeDefined();
    });

    it('should have log methods', () => {
        expect(logger.info).toBeDefined();
        expect(logger.error).toBeDefined();
        expect(logger.warn).toBeDefined();
        expect(logger.debug).toBeDefined();
    });

    it('should log without error', () => {
        const spy = jest.spyOn(logger, 'info');
        logger.info('test message');
        expect(spy).toHaveBeenCalledWith('test message');
    });
});
