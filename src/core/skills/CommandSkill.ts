import { ISkill } from '../interfaces/ISkill';
import { logger } from '../../utils/logger';
import { exec } from 'child_process';

export class CommandSkill implements ISkill {
    name = 'terminal_command';
    description = 'Executa comandos de terminal permitidos de forma segura.';
    
    // Lista de comandos/binários permitidos para execução
    private readonly ALLOWED_COMMANDS = [
        'git',
        'npm',
        'node',
        'echo',
        'ls',
        'pwd',
        'whoami',
        'date',
        'curl',
        'ping',
        'uptime'
    ];

    parameters = {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'O comando de terminal completo a ser executado (ex: "git status", "npm test").'
            }
        },
        required: ['command']
    };

    private execPromise(command: string): Promise<{ stdout: string; stderr: string }> {
        return new Promise((resolve, reject) => {
            exec(command, { timeout: 10000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) {
                    // Anexa stdout/stderr ao erro para debugging
                    (error as any).stdout = stdout;
                    (error as any).stderr = stderr;
                    reject(error);
                    return;
                }
                resolve({ stdout, stderr });
            });
        });
    }

    async execute(args: { command: string }): Promise<string> {
        try {
            const command = args.command.trim();
            const binary = command.split(' ')[0];

            if (!this.ALLOWED_COMMANDS.includes(binary)) {
                logger.warn(`[CommandSkill] Tentativa de execução de comando não permitido: ${command}`);
                return `Erro de Segurança: O comando "${binary}" não está na lista de permitidos.`;
            }

            // Bloqueio de caracteres perigosos
            if (/[;&|`$]/.test(command)) {
                logger.warn(`[CommandSkill] Tentativa de uso de caracteres perigosos: ${command}`);
                return 'Erro de Segurança: Caracteres de encadeamento (; | & ` $) não são permitidos.';
            }

            logger.info(`[CommandSkill] Executando comando: ${command}`);

            // Executa o comando
            const { stdout, stderr } = await this.execPromise(command);

            let output = '';
            if (stdout) output += `STDOUT:\n${stdout}\n`;
            if (stderr) output += `STDERR:\n${stderr}\n`;

            if (!output) return 'Comando executado com sucesso (sem saída).';

            // Truncate output if too long
            if (output.length > 2000) {
                return output.substring(0, 2000) + '\n... (saída truncada)';
            }

            return output;

        } catch (error: any) {
            logger.error(error, `Erro ao executar CommandSkill: ${args.command}`);
            
            // Retorna stderr do erro se disponível
            let errorMsg = `Erro na execução do comando: ${error.message}`;
            if (error.stderr) errorMsg += `\nSTDERR: ${error.stderr}`;
            if (error.stdout) errorMsg += `\nSTDOUT: ${error.stdout}`;
            
            return errorMsg;
        }
    }
}
