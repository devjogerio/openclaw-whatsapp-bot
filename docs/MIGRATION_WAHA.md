# Guia de Migração: Baileys para WAHA (WhatsApp HTTP API)

Este documento detalha o processo de migração da biblioteca `Baileys` para a API `WAHA` (WhatsApp HTTP API) no projeto OpenClaw WhatsApp Bot.

## 1. Visão Geral

A migração substitui a biblioteca `Baileys` (que roda no mesmo processo Node.js) por uma arquitetura baseada em microsserviços usando o `WAHA` (executado em um container Docker separado). O `WAHA` gerencia a conexão com o WhatsApp e expõe uma API HTTP e Webhooks para comunicação.

## 2. Motivação

- **Estabilidade:** Isolar a conexão do WhatsApp em um serviço dedicado reduz o risco de falhas no bot principal derrubarem a conexão.
- **Escalabilidade:** Permite escalar o bot independentemente do serviço de conexão.
- **Manutenibilidade:** Remove a complexidade de gerenciar o socket do WhatsApp diretamente no código do bot.
- **API Unificada:** Facilita a integração com outros serviços via HTTP/Webhooks.

## 3. Arquitetura

### Antes (Baileys)
- **Monolito:** O bot e a conexão WhatsApp rodavam no mesmo processo.
- **Conexão:** Socket direto com servidores do WhatsApp.
- **Estado:** Sessão salva em arquivos locais (`auth_info_baileys`).

### Depois (WAHA)
- **Microsserviços:**
    - `app`: Lógica do bot, IA, Handlers.
    - `waha`: Container dedicado para WhatsApp (imagem `devlikeapro/waha`).
    - `ollama`: Serviço de IA local.
- **Comunicação:**
    - `app` -> `waha`: Requisições HTTP (REST API) para enviar mensagens.
    - `waha` -> `app`: Webhooks (HTTP POST) para receber mensagens e eventos.
- **Estado:** Sessão gerenciada pelo container `waha` (volume `waha_sessions`).

## 4. Mapeamento de Funcionalidades

| Funcionalidade | Baileys (`BaileysClient.ts`) | WAHA (`WahaClient.ts`) |
| :--- | :--- | :--- |
| **Conexão** | `makeWASocket()`, `ev.on('connection.update')` | `axios.post('/api/sessions')` (automático), Webhook `session.status` |
| **Receber Mensagem** | `ev.on('messages.upsert')` | Webhook `POST /webhook` (evento `message`) |
| **Enviar Texto** | `sock.sendMessage(jid, { text })` | `axios.post('/api/sendText', { chatId, text })` |
| **Enviar Áudio** | `sock.sendMessage(jid, { audio })` | `axios.post('/api/sendVoice', { chatId, file: { data: base64 } })` |
| **Baixar Mídia** | `downloadMediaMessage()` | `axios.get('/api/files/:id')` ou URL direta no webhook |
| **QR Code** | Terminal (via `qrcode-terminal`) | Logs do container `waha` ou Dashboard (`http://localhost:3001/dashboard`) |

## 5. Implementação

### 5.1. `WahaClient.ts`
Nova classe que implementa `IMessagingClient`.
- Inicia um servidor Express para receber Webhooks na porta 3000.
- Usa `axios` para enviar comandos para o WAHA (porta 3000 interna, mapeada para 3001 externa).

### 5.2. `MessageHandler.ts`
Refatorado para ser agnóstico à biblioteca.
- Recebe payload normalizado do `WahaClient` ou adapta o payload do WAHA.
- Usa `client.downloadMedia(url)` para baixar imagens/áudios.

### 5.3. Docker Compose
- Adicionado serviço `waha`.
- Configuradas variáveis de ambiente: `WAHA_WEBHOOK_URL`, `WAHA_DOWNLOAD_MEDIA=true`.

## 6. Como Executar

1. **Configurar .env:**
   Certifique-se de que as variáveis do WAHA estão definidas (ver `.env.example`).

2. **Iniciar Serviços:**
   ```bash
   docker-compose up --build -d
   ```

3. **Escanear QR Code:**
   - Acesse os logs do WAHA: `docker logs -f waha`
   - OU acesse o Dashboard: `http://localhost:3001/dashboard`

4. **Testar:**
   Envie uma mensagem para o número conectado.

## 7. Limitações Conhecidas e Próximos Passos

- **Transcrição de Áudio:** O `OllamaService` ainda não implementa transcrição nativa. É necessário integrar com um serviço Whisper (local ou remoto) ou usar a API do WAHA se disponível.
- **Tipagem:** O payload do webhook do WAHA é tratado como `any` em alguns pontos. Criar interfaces TypeScript estritas para os eventos do WAHA.
- **Segurança:** Validar assinatura dos webhooks do WAHA para garantir autenticidade.

## 8. Rollback

Caso seja necessário reverter para Baileys (não recomendado):
1. Reinstalar pacotes: `npm install @whiskeysockets/baileys qrcode-terminal`.
2. Restaurar `BaileysClient.ts` (ver histórico do Git).
3. Alterar `server.ts` para usar `BaileysClient`.
4. Remover serviço `waha` do `docker-compose.yml`.
