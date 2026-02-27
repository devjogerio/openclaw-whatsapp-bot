import { FileSkill } from '../../../src/core/skills/FileSkill';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
jest.mock('fs/promises');
// Mock pdf-parse
jest.mock('pdf-parse', () => {
    return jest.fn().mockResolvedValue({ text: 'PDF Content' });
});
// Mock path
jest.mock('path', () => {
    const originalPath = jest.requireActual('path');
    return {
        ...originalPath,
        resolve: jest.fn(),
        relative: jest.fn(),
        join: originalPath.join,
        basename: originalPath.basename,
        extname: originalPath.extname
    };
});

describe('FileSkill', () => {
    let skill: FileSkill;
    const mockCwd = '/mock/cwd';

    beforeEach(() => {
        jest.clearAllMocks();
        skill = new FileSkill();
        jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
        
        // Setup path mocks behavior
        (path.resolve as jest.Mock).mockImplementation((...args) => args.join('/'));
        (path.relative as jest.Mock).mockImplementation((from, to) => to.replace(from + '/', ''));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should have correct metadata', () => {
        expect(skill.name).toBe('file_manager');
        expect(skill.parameters.properties.recursive).toBeDefined();
        expect(skill.parameters.properties.start_line).toBeDefined();
    });

    it('should list files in directory', async () => {
        (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
        (fs.readdir as jest.Mock).mockResolvedValue([
            { name: 'file1.txt', isDirectory: () => false },
            { name: 'dir1', isDirectory: () => true }
        ]);

        const result = await skill.execute({ action: 'list', path: 'docs' });

        expect(fs.readdir).toHaveBeenCalledWith(expect.stringContaining('docs'), expect.any(Object));
        expect(result).toContain('file1.txt');
        expect(result).toContain('dir1/');
    });

    it('should read file content', async () => {
        (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
        (fs.readFile as jest.Mock).mockResolvedValue('Line 1\nLine 2\nLine 3');

        const result = await skill.execute({ action: 'read', path: 'test.txt' });

        expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('test.txt'), 'utf-8');
        expect(result).toContain('Line 1');
        expect(result).toContain('Line 3');
    });

    it('should read partial file content (start_line/end_line)', async () => {
        (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
        (fs.readFile as jest.Mock).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4');

        const result = await skill.execute({ action: 'read', path: 'test.txt', start_line: 2, end_line: 3 });

        expect(result).toContain('Line 2');
        expect(result).toContain('Line 3');
        expect(result).not.toContain('Line 1');
        expect(result).not.toContain('Line 4');
    });

    it('should prevent path traversal', async () => {
        (path.resolve as jest.Mock).mockReturnValue('/outside/project/secret.txt');
        
        const result = await skill.execute({ action: 'read', path: '../../secret.txt' });
        
        expect(result).toContain('Acesso negado');
    });

    it('should show metadata when requested', async () => {
        // Mock fs.stat to handle different calls
        (fs.stat as jest.Mock).mockImplementation((filePath: string) => {
            if (filePath.endsWith('file1.txt')) {
                return Promise.resolve({
                    isDirectory: () => false,
                    isFile: () => true,
                    size: 1024,
                    mtime: new Date('2023-01-01T00:00:00Z')
                });
            }
            // Default assumes directory for the base path
            return Promise.resolve({
                isDirectory: () => true,
                isFile: () => false
            });
        });

        (fs.readdir as jest.Mock).mockResolvedValue([
            { name: 'file1.txt', isDirectory: () => false }
        ]);

        const result = await skill.execute({ action: 'list', path: '.', metadata: true });

        expect(result).toContain('1.00KB');
        expect(result).toContain('2023-01-01');
    });
});
