import { FileSkill } from '../../../src/core/skills/FileSkill';
import * as fs from 'fs/promises';
import * as path from 'path';
import pdf = require('pdf-parse');

// Mock fs/promises
jest.mock('fs/promises', () => ({
    stat: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn()
}));

// Mock pdf-parse
jest.mock('pdf-parse', () => jest.fn());

describe('FileSkill', () => {
    let skill: FileSkill;
    const mockCwd = '/project';
    // Cast mocked fs to jest.Mocked<typeof fs>
    const mockFs = fs as unknown as jest.Mocked<typeof fs>;
    const mockPdf = pdf as unknown as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock process.cwd() BEFORE instantiating FileSkill if FileSkill uses it in constructor/properties
        // In our implementation, FileSkill uses process.cwd() inside execute(), so mocking it here is fine.
        // However, if we change implementation to init BASE_DIR in constructor, we need to be careful.
        // Let's mock process.cwd to return a fixed path
        jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);

        skill = new FileSkill();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should have correct metadata', () => {
        expect(skill.name).toBe('file_manager');
        expect(skill.parameters).toBeDefined();
    });

    it('should list files in valid directory', async () => {
        const dirPath = 'src';
        // Mock path.resolve to behave predictably in test environment if needed, 
        // but real path.resolve should work if we control inputs.
        // On unix: path.resolve('/project', 'src') -> '/project/src'
        const absolutePath = path.resolve(mockCwd, dirPath);
        
        // Mock fs.stat
        mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
        // Mock fs.readdir
        mockFs.readdir.mockResolvedValue(['file1.ts', 'file2.ts'] as any);

        const result = await skill.execute({ action: 'list', path: dirPath });

        // Verify implementation details
        // Note: Implementation calls path.resolve(process.cwd(), args.path)
        expect(mockFs.stat).toHaveBeenCalledWith(absolutePath);
        expect(mockFs.readdir).toHaveBeenCalledWith(absolutePath);
        expect(result).toContain('file1.ts');
        expect(result).toContain('file2.ts');
    });

    it('should read valid file content', async () => {
        const filePath = 'README.md';
        const absolutePath = path.resolve(mockCwd, filePath);
        const fileContent = 'Hello World';

        mockFs.stat.mockResolvedValue({ isFile: () => true } as any);
        mockFs.readFile.mockResolvedValue(fileContent);

        const result = await skill.execute({ action: 'read', path: filePath });

        expect(mockFs.stat).toHaveBeenCalledWith(absolutePath);
        expect(mockFs.readFile).toHaveBeenCalledWith(absolutePath, 'utf-8');
        expect(result).toContain(fileContent);
    });

    it('should prevent path traversal (access outside project)', async () => {
        const unsafePath = '../secret.txt';
        // path.resolve('/project', '../secret.txt') -> '/secret.txt' (which is outside '/project')
        
        const result = await skill.execute({ action: 'read', path: unsafePath });

        expect(result).toContain('Erro de Segurança');
        expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('should handle read on directory gracefully', async () => {
        const dirPath = 'src';
        const absolutePath = path.resolve(mockCwd, dirPath);
        
        mockFs.stat.mockResolvedValue({ isFile: () => false } as any);

        const result = await skill.execute({ action: 'read', path: dirPath });
        
        expect(mockFs.stat).toHaveBeenCalledWith(absolutePath);
        expect(result).toContain('não é um arquivo');
    });

    it('should handle list on file gracefully', async () => {
        const filePath = 'file.ts';
        const absolutePath = path.resolve(mockCwd, filePath);
        
        (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => false });

        const result = await skill.execute({ action: 'list', path: filePath });
        
        expect(fs.stat).toHaveBeenCalledWith(absolutePath);
        expect(result).toContain('não é um diretório');
    });

    it('should read PDF file content', async () => {
        const filePath = 'document.pdf';
        const absolutePath = path.resolve(mockCwd, filePath);
        const pdfContent = 'PDF Text Content';
        const pdfBuffer = Buffer.from('PDF Binary Data');

        (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
        (fs.readFile as jest.Mock).mockImplementation((path) => {
            if (path === absolutePath) return Promise.resolve(pdfBuffer);
            return Promise.reject(new Error('File not found'));
        });

        // Mock pdf-parse
        (pdf as unknown as jest.Mock).mockResolvedValue({ text: pdfContent });

        const result = await skill.execute({ action: 'read', path: filePath });

        expect(fs.stat).toHaveBeenCalledWith(absolutePath);
        expect(fs.readFile).toHaveBeenCalledWith(absolutePath); // Called without encoding for PDF
        expect(pdf).toHaveBeenCalledWith(pdfBuffer);
        expect(result).toContain(pdfContent);
    });
});
