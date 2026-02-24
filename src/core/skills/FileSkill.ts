import { ISkill } from '../interfaces/ISkill';
import { logger } from '../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileSkill implements ISkill {
    name = 'file_manager';
    description = 'Lista arquivos ou lê o conteúdo de um arquivo específico em um diretório seguro.';
    parameters = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['list', 'read'],
                description: 'Ação a ser executada: "list" para listar arquivos, "read" para ler conteúdo.'
            },
            path: {
                type: 'string',
                description: 'Caminho do arquivo ou diretório (relativo ao diretório raiz do projeto).'
            }
        },
        required: ['action', 'path']
    };

    async execute(args: { action: 'list' | 'read'; path: string }): Promise<string> {
        try {
            // Diretório base seguro para operações de arquivo
            const BASE_DIR = process.cwd(); 

            // Normaliza e valida o caminho para evitar Path Traversal
            // A IA pode passar caminhos absolutos ou relativos, precisamos garantir que fique dentro do projeto
            const requestedPath = path.resolve(BASE_DIR, args.path);
            
            // Verificação de segurança: O caminho resolvido DEVE começar com o BASE_DIR
            if (!requestedPath.startsWith(BASE_DIR)) {
                logger.warn(`[FileSkill] Tentativa de acesso fora do diretório base: ${args.path} -> ${requestedPath}`);
                return 'Erro de Segurança: Acesso negado a diretórios fora do escopo do projeto.';
            }

            logger.info(`[FileSkill] Executando ${args.action} em: ${requestedPath}`);

            if (args.action === 'list') {
                const stats = await fs.stat(requestedPath);
                if (!stats.isDirectory()) {
                     return `Erro: "${args.path}" não é um diretório.`;
                }
                const files = await fs.readdir(requestedPath);
                return `Arquivos em "${args.path}":\n${files.join('\n')}`;
            } else if (args.action === 'read') {
                const stats = await fs.stat(requestedPath);
                if (!stats.isFile()) {
                    return `Erro: "${args.path}" não é um arquivo.`;
                }
                const content = await fs.readFile(requestedPath, 'utf-8');
                // Limita o tamanho do conteúdo retornado para não estourar o contexto da IA
                if (content.length > 5000) {
                    return `Conteúdo do arquivo "${args.path}" (truncado nos primeiros 5000 caracteres):\n\n${content.substring(0, 5000)}...`;
                }
                return `Conteúdo do arquivo "${args.path}":\n\n${content}`;
            }

            return 'Ação desconhecida.';
        } catch (error: any) {
            logger.error(error, `Erro ao executar FileSkill: ${args.action} em ${args.path}`);
            return `Erro ao acessar arquivo/diretório: ${error.message}`;
        }
    }
}
