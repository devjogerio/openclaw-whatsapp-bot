# Guia de Deploy: OpenClaw WhatsApp Bot com WAHA e Ollama

Este guia descreve como implantar e executar o projeto utilizando Docker Compose, integrando o bot (Node.js), a API do WhatsApp (WAHA) e o modelo de IA local (Ollama).

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/) instalados.
- Arquivo `.env` configurado (baseado em `.env.example`).
- Porta 3000 (App), 3001 (WAHA Dashboard) e 11434 (Ollama) livres.

## Configuração

1. **Variáveis de Ambiente**
   Copie o exemplo e ajuste conforme necessário:
   ```bash
   cp .env.example .env
   ```
   Edite o `.env` e defina senhas seguras para `WAHA_API_KEY`, `WAHA_DASHBOARD_PASSWORD`, etc.

2. **Verificar Configuração**
   Valide o arquivo `docker-compose.yml`:
   ```bash
   docker compose config
   ```

## Execução

1. **Build e Start**
   Inicie todos os serviços em segundo plano:
   ```bash
   docker compose up -d --build
   ```

2. **Verificar Logs**
   Acompanhe os logs para garantir que tudo subiu corretamente:
   ```bash
   docker compose logs -f
   ```
   *Aguarde até ver "Server listening on port 3000" no serviço `app` e logs do WAHA indicando prontidão.*

3. **Healthchecks**
   Verifique o status dos containers:
   ```bash
   docker compose ps
   ```
   Todos devem estar com status `healthy` (ou `Up` se o healthcheck ainda estiver rodando).

## Conexão com WhatsApp

1. Acesse o **WAHA Dashboard**: [http://localhost:3001/dashboard](http://localhost:3001/dashboard)
2. Faça login com as credenciais do `.env` (`WAHA_DASHBOARD_USERNAME` / `WAHA_DASHBOARD_PASSWORD`).
3. Inicie uma sessão "default" se não existir.
4. Clique no ícone de **QR Code** (ou veja nos logs com `docker logs waha`).
5. Escaneie com seu WhatsApp (Aparelhos Conectados).

## Troubleshooting

### Erro: "Connection refused" entre containers
- Verifique se os serviços estão na mesma rede (`openclaw_network`).
- Certifique-se de que o `app` usa o nome do serviço (`http://waha:3000`) e não `localhost`.

### Erro: Ollama não responde
- O download do modelo (llama3) pode demorar na primeira execução. Verifique os logs: `docker logs openclaw-ollama`.
- Se necessário, execute manualmente o pull do modelo:
  ```bash
  docker compose exec ollama ollama pull llama3
  ```

### Erro: Permissão no Docker
- Se estiver no Linux, use `sudo` ou adicione seu usuário ao grupo docker.

### Logs de Erro "Terminal#1-1038"
- Geralmente relacionado à biblioteca antiga (Baileys) falhando na conexão. Com a migração para WAHA, esse erro deve desaparecer. Se persistir, verifique se há containers antigos rodando (`docker ps -a`) e remova-os.

## Estrutura de Volumes

- `waha_sessions`: Armazena a sessão do WhatsApp (não precisa escanear QR code a cada restart).
- `waha_files`: Arquivos de mídia baixados.
- `ollama_data`: Modelos de IA baixados.

## Comandos Úteis

- Parar tudo: `docker compose down`
- Reiniciar apenas o bot: `docker compose restart app`
- Ver logs do bot: `docker compose logs -f app`
