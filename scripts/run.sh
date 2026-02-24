#!/bin/bash

# ======================================================================================
# Script de Automação de Execução do Projeto OpenClaw WhatsApp Bot
# ======================================================================================
# Este script gerencia o ciclo de vida da aplicação Dockerizada, incluindo configuração,
# execução e testes.
#
# Uso: ./run.sh [dev|prod|test|stop|logs]
#
# Autor: Equipe OpenClaw
# Data: 2026-02-24
# ======================================================================================

set -e # Aborta o script em caso de erro

# Cores para logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretório base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$BASE_DIR/.env"
ENV_EXAMPLE="$BASE_DIR/.env.example"
DOCKER_COMPOSE_FILE="$BASE_DIR/docker-compose.yml"

# Função de Log
log() {
    local type=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    case $type in
        "INFO") echo -e "${BLUE}[INFO]${NC} $timestamp - $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $timestamp - $message" ;;
        "WARN") echo -e "${YELLOW}[WARN]${NC} $timestamp - $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $timestamp - $message" ;;
    esac
}

# Verificação de Dependências
check_dependencies() {
    log "INFO" "Verificando dependências do sistema..."
    
    if ! command -v docker &> /dev/null; then
        log "ERROR" "Docker não está instalado. Por favor, instale o Docker primeiro."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log "ERROR" "O daemon do Docker não está rodando. Inicie o Docker."
        exit 1
    fi

    log "SUCCESS" "Dependências verificadas com sucesso."
}

# Configuração do Ambiente
setup_env() {
    log "INFO" "Verificando arquivo de configuração (.env)..."
    
    if [ ! -f "$ENV_FILE" ]; then
        log "WARN" "Arquivo .env não encontrado. Criando a partir do .env.example..."
        if [ -f "$ENV_EXAMPLE" ]; then
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            log "SUCCESS" "Arquivo .env criado. Por favor, edite-o com suas configurações reais antes de continuar."
            # Opcional: Gerar chaves aleatórias se necessário
            # sed -i '' "s/WAHA_API_KEY=.*/WAHA_API_KEY=$(openssl rand -hex 16)/" "$ENV_FILE"
        else
            log "ERROR" "Arquivo .env.example não encontrado. Impossível configurar ambiente."
            exit 1
        fi
    else
        log "INFO" "Arquivo .env já existe."
    fi
}

# Execução em Modo Desenvolvimento
run_dev() {
    log "INFO" "Iniciando em modo de DESENVOLVIMENTO..."
    check_dependencies
    setup_env
    
    log "INFO" "Construindo e iniciando containers (logs em tempo real)..."
    docker compose -f "$DOCKER_COMPOSE_FILE" up --build
}

# Execução em Modo Produção
run_prod() {
    log "INFO" "Iniciando em modo de PRODUÇÃO..."
    check_dependencies
    setup_env
    
    log "INFO" "Construindo e iniciando containers em background (detached)..."
    docker compose -f "$DOCKER_COMPOSE_FILE" up -d --build
    
    log "INFO" "Aguardando serviços inicializarem para verificação de saúde..."
    sleep 10
    
    if docker compose -f "$DOCKER_COMPOSE_FILE" ps | grep "healthy" > /dev/null; then
        log "SUCCESS" "Serviços iniciados e saudáveis!"
        docker compose -f "$DOCKER_COMPOSE_FILE" ps
    else
        log "WARN" "Alguns serviços podem não estar saudáveis. Verifique os logs."
        docker compose -f "$DOCKER_COMPOSE_FILE" ps
    fi
}

# Execução de Testes
run_test() {
    log "INFO" "Executando suíte de TESTES..."
    check_dependencies
    setup_env
    
    log "INFO" "Rodando testes unitários dentro do container..."
    # Executa npm test dentro de um container temporário
    docker compose -f "$DOCKER_COMPOSE_FILE" run --rm app npm test
}

# Parar Execução
stop_services() {
    log "INFO" "Parando todos os serviços..."
    docker compose -f "$DOCKER_COMPOSE_FILE" down
    log "SUCCESS" "Serviços parados e removidos."
}

# Exibir Logs
show_logs() {
    log "INFO" "Exibindo logs dos containers..."
    docker compose -f "$DOCKER_COMPOSE_FILE" logs -f
}

# Menu de Ajuda
show_help() {
    echo -e "${BLUE}OpenClaw WhatsApp Bot - Script de Gerenciamento${NC}"
    echo "Uso: ./run.sh [comando]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  dev   - Inicia a aplicação em modo de desenvolvimento (logs no terminal)"
    echo "  prod  - Inicia a aplicação em modo de produção (background/detached)"
    echo "  test  - Executa a suíte de testes automatizados"
    echo "  stop  - Para e remove todos os containers do projeto"
    echo "  logs  - Acompanha os logs dos containers em execução"
    echo ""
}

# Lógica Principal
case "$1" in
    dev)
        run_dev
        ;;
    prod)
        run_prod
        ;;
    test)
        run_test
        ;;
    stop)
        stop_services
        ;;
    logs)
        show_logs
        ;;
    *)
        show_help
        exit 1
        ;;
esac
