import { ISkill } from '../interfaces/ISkill';
import { logger } from '../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as pdf from 'pdf-parse';

interface FileParams {
    action: 'list' | 'read';
    path: string;
    recursive?: boolean; // Para listagem
    metadata?: boolean; // Para listagem (mostrar tamanho, data)
    start_line?: number; // Para leitura parcial
    end_line?: number; // Para leitura parcial
}

export class FileSkill implements ISkill {
    name = 'file_manager';
    description = 'Lista arquivos recursivamente ou lê conteúdo parcial de arquivos. Suporta PDF e Texto.';
    
    parameters = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['list', 'read'],
                description: 'Ação: "list" (arquivos) ou "read" (conteúdo).'
            },
            path: {
                type: 'string',
                description: 'Caminho relativo do arquivo ou diretório.'
            },
            recursive: {
                type: 'boolean',
                description: 'Se true, lista subdiretórios recursivamente (apenas para action="list").'
            },
            metadata: {
                type: 'boolean',
                description: 'Se true, exibe tamanho e data de modificação (apenas para action="list").'
            },
            start_line: {
                type: 'number',
                description: 'Linha inicial para leitura (1-based, apenas para action="read").'
            },
            end_line: {
                type: 'number',
                description: 'Linha final para leitura (apenas para action="read").'
            }
        },
        required: ['action', 'path']
    };

    private async validatePath(relativePath: string): Promise<string> {
        const BASE_DIR = process.cwd();
        const resolvedPath = path.resolve(BASE_DIR, relativePath);

        if (!resolvedPath.startsWith(BASE_DIR)) {
            throw new Error(`Acesso negado: O caminho deve estar dentro do projeto.`);
        }
        return resolvedPath;
    }

    private async listFiles(dirPath: string, recursive: boolean, metadata: boolean, level: number = 0): Promise<string[]> {
        if (level > 3) return []; // Limite de profundidade para evitar loops infinitos ou output gigante

        let results: string[] = [];
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = path.relative(process.cwd(), fullPath);
            
            let info = relativePath;
            if (metadata) {
                const stats = await fs.stat(fullPath);
                const size = (stats.size / 1024).toFixed(2) + 'KB';
                const date = stats.mtime.toISOString().split('T')[0];
                info += ` [${size} | ${date}]`;
            }

            if (entry.isDirectory()) {
                results.push(info + '/');
                if (recursive) {
                    const subFiles = await this.listFiles(fullPath, recursive, metadata, level + 1);
                    results = results.concat(subFiles);
                }
            } else {
                results.push(info);
            }
        }
        return results;
    }

    private async readFileContent(filePath: string, startLine?: number, endLine?: number): Promise<string> {
        const ext = path.extname(filePath).toLowerCase();
        let content = '';

        if (ext === '.pdf') {
            const dataBuffer = await fs.readFile(filePath);
            const pdfData = await pdf.default(dataBuffer);
            content = pdfData.text;
        } else {
            content = await fs.readFile(filePath, 'utf-8');
        }

        const lines = content.split('\n');
        const totalLines = lines.length;

        let start = 0;
        let end = totalLines;

        if (startLine && startLine > 0) start = startLine - 1;
        if (endLine && endLine > 0) end = endLine;

        // Ajuste de limites
        if (start < 0) start = 0;
        if (end > totalLines) end = totalLines;
        if (start >= end) return `Erro: Intervalo de linhas inválido (Start: ${start + 1}, End: ${end}). O arquivo tem ${totalLines} linhas.`;

        const selectedLines = lines.slice(start, end);
        const truncatedContent = selectedLines.join('\n');
        
        // Header informativo
        let header = `Conteúdo de "${path.basename(filePath)}"`;
        if (startLine || endLine) {
            header += ` (Linhas ${start + 1} a ${end} de ${totalLines})`;
        }
        
        // Limite de segurança de caracteres (se não for PDF, pois PDF é difícil de cortar por linha exata as vezes)
        if (truncatedContent.length > 8000 && !startLine && !endLine) {
             return `${header} - TRUNCADO (use start_line/end_line para ler o resto):\n\n${truncatedContent.substring(0, 8000)}...`;
        }

        return `${header}:\n\n${truncatedContent}`;
    }

    async execute(args: FileParams): Promise<string> {
        try {
            const resolvedPath = await this.validatePath(args.path);
            const stats = await fs.stat(resolvedPath);

            if (args.action === 'list') {
                if (!stats.isDirectory()) return `Erro: "${args.path}" não é um diretório.`;
                
                const files = await this.listFiles(resolvedPath, args.recursive || false, args.metadata || false);
                return `Arquivos em "${args.path}":\n${files.join('\n')}`;
            } 
            
            if (args.action === 'read') {
                if (!stats.isFile()) return `Erro: "${args.path}" não é um arquivo.`;
                return await this.readFileContent(resolvedPath, args.start_line, args.end_line);
            }

            return 'Ação desconhecida.';

        } catch (error: any) {
            logger.error(error, `Erro FileSkill: ${args.action} ${args.path}`);
            return `Erro: ${error.message}`;
        }
    }
}
