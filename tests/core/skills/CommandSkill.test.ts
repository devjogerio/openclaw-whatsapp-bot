import { CommandSkill } from '../../../src/core/skills/CommandSkill';
import * as child_process from 'child_process';

// Mock child_process module entirely
jest.mock('child_process', () => ({
    exec: jest.fn()
}));

describe('CommandSkill', () => {
    let skill: CommandSkill;

    beforeEach(() => {
        jest.clearAllMocks();
        skill = new CommandSkill();
    });

    it('should have correct metadata', () => {
        expect(skill.name).toBe('terminal_command');
        expect(skill.parameters.properties.command).toBeDefined();
        expect(skill.parameters.properties.timeout).toBeDefined();
    });

    it('should execute allowed command', async () => {
        (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) => {
            cb(null, 'git version 2.0', '');
            return {};
        });

        const result = await skill.execute({ command: 'git --version' });

        expect(child_process.exec).toHaveBeenCalledWith('git --version', expect.any(Object), expect.any(Function));
        expect(result).toContain('git version 2.0');
    });

    it('should execute new allowed read commands', async () => {
        (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) => {
            cb(null, 'file content', '');
            return {};
        });

        await skill.execute({ command: 'cat file.txt' });
        expect(child_process.exec).toHaveBeenCalledWith('cat file.txt', expect.any(Object), expect.any(Function));

        await skill.execute({ command: 'grep pattern file.txt' });
        expect(child_process.exec).toHaveBeenCalledWith('grep pattern file.txt', expect.any(Object), expect.any(Function));
    });

    it('should respect timeout parameter', async () => {
        (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) => {
            cb(null, 'ok', '');
            return {};
        });

        await skill.execute({ command: 'ls', timeout: 5000 });

        expect(child_process.exec).toHaveBeenCalledWith('ls', expect.objectContaining({
            timeout: 5000
        }), expect.any(Function));
    });

    it('should block disallowed command', async () => {
        const result = await skill.execute({ command: 'rm -rf /' });
        
        expect(result).toContain('Erro de Segurança');
        expect(child_process.exec).not.toHaveBeenCalled();
    });

    it('should block command with dangerous characters', async () => {
        const result = await skill.execute({ command: 'echo hello; rm -rf /' });
        
        expect(result).toContain('Erro de Segurança');
        expect(child_process.exec).not.toHaveBeenCalled();
    });

    it('should handle execution error', async () => {
        (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) => {
            const error = new Error('Command failed');
            (error as any).stderr = 'Error detail'; // Attach stderr to error object
            cb(error, '', 'Error detail');
            return {};
        });

        const result = await skill.execute({ command: 'git status' });

        expect(result).toContain('Erro na execução');
        expect(result).toContain('Error detail');
    });

    it('should truncate long output', async () => {
        const longOutput = 'a'.repeat(3000);
        (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) => {
            cb(null, longOutput, '');
            return {};
        });

        const result = await skill.execute({ command: 'echo long' });

        expect(result.length).toBeLessThan(2500);
        expect(result).toContain('truncada');
    });
});
