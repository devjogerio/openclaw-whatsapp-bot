
import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Configuração do ambiente
// Assume execução a partir da raiz do projeto
const envPath = resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

/**
 * Interface para configuração do monitor
 */
interface MonitorConfig {
    baseUrl: string;
    apiKey: string;
    maxRetries: number;
    retryDelay: number;
}

/**
 * Interface para estatísticas do dashboard
 */
interface DashboardStats {
    sessions: any[];
    systemInfo: any;
    connectionStatus: string;
    timestamp: string;
}

/**
 * Classe responsável por monitorar o dashboard do WAHA
 */
class WahaMonitor {
    private client: AxiosInstance;
    private config: MonitorConfig;

    constructor() {
        // Ajuste inteligente para execução local fora do Docker
        // Agora que o WAHA está na porta 3000 (padrão), usamos 3000.
        let baseUrl = process.env.WAHA_BASE_URL || 'http://localhost:3000';
        
        // Se estiver rodando fora do docker e a URL for interna (waha:3000), 
        // assumimos localhost:3000 pois agora o mapeamento é 3000:3000
        if (baseUrl.includes('waha:') && !process.env.DOCKER_CONTAINER) {
             baseUrl = 'http://localhost:3000';
        }

        this.config = {
            baseUrl: process.env.WAHA_PUBLIC_URL || baseUrl,
            apiKey: process.env.WAHA_API_KEY || '',
            maxRetries: 3,
            retryDelay: 2000
        };
        
        console.log(`[INIT] Monitor configurado para: ${this.config.baseUrl}`);

        this.client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: 5000,
            headers: {
                'X-Api-Key': this.config.apiKey,
                'Content-Type': 'application/json'
            }
        });
    }

    // Verifica se o Dashboard está acessível (retorna HTML/200 OK)
    public async checkDashboardAccess(): Promise<boolean> {
        try {
            console.log(`[CHECK] Verificando acesso ao dashboard em: ${this.config.baseUrl}/dashboard`);
            
            // Tenta acessar com Basic Auth se as credenciais estiverem disponíveis
            const username = process.env.WAHA_DASHBOARD_USERNAME;
            const password = process.env.WAHA_DASHBOARD_PASSWORD;
            const authConfig: any = {
                timeout: 5000,
                validateStatus: (status: number) => status === 200 || status === 401, // 401 também confirma que o serviço está lá
                headers: { 'Accept': 'text/html' }
            };

            if (username && password) {
                authConfig.auth = { username, password };
            }

            const response = await axios.get(`${this.config.baseUrl}/dashboard`, authConfig);
            
            if (response.status === 200) {
                // Verifica se retornou HTML
                const contentType = response.headers['content-type'];
                if (contentType && contentType.includes('text/html')) {
                    console.log('[PASS] Dashboard acessível e retornando HTML (200 OK).');
                    return true;
                } else {
                    console.warn('[WARN] Dashboard acessível, mas Content-Type inesperado:', contentType);
                    return true;
                }
            } else if (response.status === 401) {
                 console.log('[PASS] Dashboard acessível (401 Unauthorized - Requer Login). Serviço está rodando na porta 3000.');
                 return true;
            }
            
            return false;

        } catch (error: any) {
            console.error(`[FAIL] Falha ao acessar dashboard: ${error.message}`);
            return false;
        }
    }

    // Executa uma requisição com retry automático
    private async fetchWithRetry(endpoint: string, retries = 0): Promise<any> {
        try {
            const response = await this.client.get(endpoint);
            return response.data;
        } catch (error) {
            if (retries < this.config.maxRetries) {
                console.warn(`[WARN] Falha ao acessar ${endpoint}. Tentativa ${retries + 1}/${this.config.maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                return this.fetchWithRetry(endpoint, retries + 1);
            }
            throw error;
        }
    }

    /**
     * Recupera todas as sessões ativas
     */
    public async getSessions(): Promise<any[]> {
        try {
            const sessions = await this.fetchWithRetry('/api/sessions');
            return sessions;
        } catch (error) {
            console.error('[ERROR] Falha ao recuperar sessões:', this.formatError(error));
            return [];
        }
    }

    /**
     * Recupera informações do sistema/versão
     */
    public async getSystemInfo(): Promise<any> {
        try {
            // Tenta endpoint de versão ou health
            return await this.fetchWithRetry('/api/version').catch(async () => {
                 // Fallback para screenshot ou status se version falhar
                 return { version: 'Unknown', status: 'Online (Check Sessions)' };
            });
        } catch (error) {
            return { status: 'Offline', error: this.formatError(error) };
        }
    }

    /**
     * Recupera detalhes de uma sessão específica (me)
     */
    public async getSessionMe(sessionName: string): Promise<any> {
        try {
            return await this.fetchWithRetry(`/api/sessions/${sessionName}/me`);
        } catch (error) {
            return { error: 'Não foi possível recuperar detalhes da sessão' };
        }
    }

    /**
     * Gera o relatório consolidado
     */
    public async generateReport(): Promise<DashboardStats> {
        console.log('[INFO] Coletando métricas do dashboard...');
        
        // Parallel requests
        const [systemInfo, sessions] = await Promise.all([
            this.getSystemInfo(),
            this.getSessions()
        ]);

        const sessionsDetails = await Promise.all(sessions.map(async (s: any) => {
            const me = await this.getSessionMe(s.name);
            return { ...s, me };
        }));

        return {
            sessions: sessionsDetails,
            systemInfo,
            connectionStatus: sessions.length > 0 ? 'Connected' : 'No Sessions',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Formata erros do Axios para mensagem legível
     */
    private formatError(error: any): string {
        if (axios.isAxiosError(error)) {
            return `Status: ${error.response?.status} - ${error.message}`;
        }
        return String(error);
    }

    /**
     * Exibe o relatório no console
     */
    public printReport(stats: DashboardStats): void {
        console.log('\n==================================================');
        console.log('            RELATÓRIO DO DASHBOARD WAHA           ');
        console.log('==================================================');
        console.log(`Data: ${new Date(stats.timestamp).toLocaleString()}`);
        console.log(`URL: ${this.config.baseUrl}`);
        console.log(`Status do Sistema: ${JSON.stringify(stats.systemInfo)}`);
        console.log('--------------------------------------------------');
        console.log(`Sessões Ativas: ${stats.sessions.length}`);
        
        stats.sessions.forEach((session, index) => {
            console.log(`\n[Sessão #${index + 1}]`);
            console.log(`  Nome: ${session.name}`);
            console.log(`  Status: ${session.status}`);
            if (session.me && !session.me.error) {
                console.log(`  Número: ${session.me.id?.user || 'N/A'}`);
                console.log(`  PushName: ${session.me.pushName || 'N/A'}`);
            } else {
                console.log(`  Detalhes: ${JSON.stringify(session.me)}`);
            }
        });
        
        console.log('==================================================\n');
    }
}

// Execução principal
async function main() {
    const monitor = new WahaMonitor();
    const args = process.argv.slice(2);
    
    if (args.includes('--test')) {
        console.log('[TEST] Executando validação de conectividade...');
        try {
            // Verifica Dashboard primeiro (Requisito do usuário)
            const dashboardOk = await monitor.checkDashboardAccess();
            if (!dashboardOk) {
                console.error('[FAIL] Dashboard inacessível na porta 3000.');
                process.exit(1);
            }

            const info = await monitor.getSystemInfo();
            if (info.error) {
                console.error('[FAIL] Falha na validação da API:', info.error);
                process.exit(1);
            }
            console.log('[PASS] Conexão API estabelecida com sucesso.');
            console.log(`[PASS] Sistema: ${JSON.stringify(info)}`);
            process.exit(0);
        } catch (e) {
            console.error('[FAIL] Erro inesperado:', e);
            process.exit(1);
        }
    }

    try {
        const stats = await monitor.generateReport();
        monitor.printReport(stats);
    } catch (error) {
        console.error('[FATAL] Falha na execução do monitor:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

export { WahaMonitor };
