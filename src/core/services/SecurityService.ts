import { config } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Serviço responsável pela segurança e validação de acessos.
 */
export class SecurityService {
    private allowedNumbers: Set<string>;
    private rateLimitMap: Map<string, number[]>;
    private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
    private readonly MAX_REQUESTS = 10; // 10 requisições por minuto

    constructor() {
        // Normaliza os números da config para garantir consistência
        this.allowedNumbers = new Set(
            config.whitelistNumbers.map(num => this.normalizeNumber(num))
        );
        this.rateLimitMap = new Map();
        logger.info(`SecurityService iniciado com ${this.allowedNumbers.size} números permitidos.`);
    }

    /**
     * Verifica se um número de telefone está na lista de permitidos (Whitelist).
     * @param phoneNumber O número de telefone a ser verificado (ex: 5511999999999@s.whatsapp.net ou formato bruto).
     */
    isAllowed(phoneNumber: string): boolean {
        const normalized = this.normalizeNumber(phoneNumber);
        const allowed = this.allowedNumbers.has(normalized);
        
        if (!allowed) {
            logger.warn(`Acesso negado para o número: ${this.maskSensitiveData(phoneNumber)} (Normalizado: ${this.maskSensitiveData(normalized)})`);
        }
        
        return allowed;
    }

    /**
     * Verifica se o usuário excedeu o limite de requisições.
     * Retorna true se estiver dentro do limite, false se excedeu.
     */
    checkRateLimit(phoneNumber: string): boolean {
        const normalized = this.normalizeNumber(phoneNumber);
        const now = Date.now();
        
        let timestamps = this.rateLimitMap.get(normalized) || [];
        
        // Remove timestamps antigos fora da janela
        timestamps = timestamps.filter(ts => now - ts < this.RATE_LIMIT_WINDOW);
        
        if (timestamps.length >= this.MAX_REQUESTS) {
            logger.warn(`Rate limit excedido para: ${this.maskSensitiveData(normalized)}`);
            return false;
        }
        
        timestamps.push(now);
        this.rateLimitMap.set(normalized, timestamps);
        return true;
    }

    /**
     * Mascara dados sensíveis (email, CPF, telefone) para logs.
     */
    maskSensitiveData(data: string): string {
        // Mascara emails
        if (data.includes('@') && !data.includes('whatsapp.net')) {
             const [user, domain] = data.split('@');
             return `${user.substring(0, 2)}***@${domain}`;
        }
        
        // Mascara telefones (mantém últimos 4 dígitos)
        if (data.length > 8) {
            return `****${data.slice(-4)}`;
        }
        
        return data;
    }

    /**
     * Sanitiza entrada de texto para evitar injeção básica.
     * Remove caracteres de controle e tags HTML simples.
     */
    sanitizeInput(input: string): string {
        return input
            .replace(/<[^>]*>/g, '') // Remove tags HTML
            .replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove caracteres de controle
    }

    /**
     * Normaliza o número de telefone removendo sufixos do WhatsApp e caracteres não numéricos.
     * Ex: "5511999999999@s.whatsapp.net" -> "5511999999999"
     */
    private normalizeNumber(phoneNumber: string): string {
        // Remove o sufixo @s.whatsapp.net ou @g.us se existir
        let clean = phoneNumber.split('@')[0];
        // Remove tudo que não for dígito
        clean = clean.replace(/\D/g, '');
        return clean;
    }
}
