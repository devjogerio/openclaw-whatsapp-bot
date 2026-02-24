import { config } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Serviço responsável pela segurança e validação de acessos.
 */
export class SecurityService {
    private allowedNumbers: Set<string>;

    constructor() {
        // Normaliza os números da config para garantir consistência
        this.allowedNumbers = new Set(
            config.whitelistNumbers.map(num => this.normalizeNumber(num))
        );
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
            logger.warn(`Acesso negado para o número: ${phoneNumber} (Normalizado: ${normalized})`);
        }
        
        return allowed;
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
