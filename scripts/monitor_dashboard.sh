#!/bin/bash

# ======================================================================================
# Script de Monitoramento do Dashboard WAHA
# ======================================================================================
# Este script automatiza a coleta de métricas e status do WAHA (WhatsApp HTTP API).
#
# Funcionalidades:
# - Verifica dependências (Node.js, Docker)
# - Verifica se o container WAHA está rodando
# - Executa o monitor TypeScript para coletar dados da API
# - Exibe relatório consolidado
#
# Uso: ./monitor_dashboard.sh
# ======================================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Diretórios
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_TS="$BASE_DIR/scripts/waha-monitor.ts"

log() {
    echo -e "${BLUE}[MONITOR]${NC} $1"
}

check_dependencies() {
    log "Verificando dependências..."
    if ! command -v node &> /dev/null; then
        echo -e "${RED}[ERRO] Node.js não encontrado.${NC}"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}[ERRO] Docker não encontrado.${NC}"
        exit 1
    fi
}

check_waha_status() {
    log "Verificando status do container WAHA..."
    if docker ps | grep -q "waha"; then
        echo -e "${GREEN}[OK] Container WAHA está rodando.${NC}"
    else
        echo -e "${YELLOW}[AVISO] Container WAHA não encontrado ou parado.${NC}"
        read -p "Deseja iniciar os serviços agora? (s/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            log "Iniciando serviços..."
            "$BASE_DIR/scripts/run.sh" prod
        else
            echo -e "${RED}[ERRO] Não é possível monitorar sem o serviço rodando.${NC}"
            exit 1
        fi
    fi
}

run_monitor() {
    log "Executando script de monitoramento..."
    echo "----------------------------------------------------------------"
    
    # Executa via npx ts-node para não depender de instalação global
    # Passa argumentos recebidos pelo script shell para o script TS
    if npx ts-node "$SCRIPT_TS" "$@"; then
        echo "----------------------------------------------------------------"
        if [[ "$1" == "--test" ]]; then
             echo -e "${GREEN}[SUCESSO] Validação concluída.${NC}"
        else
             echo -e "${GREEN}[SUCESSO] Relatório gerado com sucesso.${NC}"
        fi
    else
        echo -e "${RED}[ERRO] Falha ao executar o script de monitoramento.${NC}"
        exit 1
    fi
}

# Fluxo Principal
echo -e "${BLUE}=== OpenClaw WAHA Dashboard Monitor ===${NC}"
check_dependencies
check_waha_status
run_monitor "$@"
