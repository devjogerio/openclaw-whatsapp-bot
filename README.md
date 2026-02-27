# OpenClaw WhatsApp Bot

Assistente de IA autônomo e multimodal integrado ao WhatsApp, projetado para atuar como um "funcionário digital" capaz de executar tarefas complexas, acessar a web, gerenciar arquivos e controlar o sistema operacional através de linguagem natural (texto e voz).

## 🚀 Funcionalidades Principais

### 🚀 Funcionalidades Principais

### 🧠 Inteligência Artificial & Multimodalidade
- **Integração OpenClaw API (Novo)**: Sistema principal de IA utilizando a API OpenClaw para processamento avançado, com suporte a caching e retry logic.
- **Processamento de Linguagem Natural**: Capacidade de compreensão profunda de contexto e instruções complexas.
- **Modo Híbrido/Backup**: Suporte legado a **Ollama** (local) para ambientes sem conexão externa.
- **Visão Computacional**: Suporte a análise de imagens via OpenClaw Vision.
- **Performance & UX (Novo)**:
  - **Streaming de Respostas**: Feedback visual instantâneo (digitando...) e envio progressivo de texto.
  - **Persistência de Cache**: Utilização de **Redis** para cache distribuído e resiliente a reinicializações.
- **Suporte a Voz (Bidirecional)**:
  - **Speech-to-Text (STT)**: Transcrição automática de áudios recebidos.
  - **Text-to-Speech (TTS)**: Respostas em áudio natural.

### 🛠 Sistema de Skills (Habilidades)
O bot possui um sistema extensível de skills que permite interagir com o mundo real:
- **Web Search**: Realiza pesquisas na internet em tempo real (via DuckDuckGo) para fornecer informações atualizadas.
- **File Management**:
  - Listagem e leitura segura de arquivos locais.
  - **Leitura de PDF**: Extração e análise de conteúdo de documentos PDF.
  - Proteção contra *Path Traversal* para segurança do sistema.
- **Terminal Commands**:
  - Execução segura de comandos de shell permitidos (`ls`, `echo`, `cat`, `grep`, etc.).
  - Whitelist rigorosa para prevenir execução de comandos perigosos.
- **Date & Time**: Consulta e manipulação de datas e horários.
- **Google Calendar (Novo)**: Integração completa com o Google Calendar para gerenciar agenda pessoal.
  - Listar próximos eventos.
  - Criar novos compromissos com data, hora e descrição.
  - Atualizar detalhes de eventos existentes.
  - Excluir eventos.
  - Autenticação segura via OAuth2.
- **Notion (Novo)**: Integração com Notion para gestão de conhecimento.
  - Busca inteligente de páginas e bancos de dados.
  - Criação de novas páginas em databases.
  - Leitura de conteúdo de páginas.
  - Adição de blocos de texto a páginas existentes.

### 🔒 Segurança & Arquitetura
- **Clean Architecture**: Separação clara entre Core, Infraestrutura e Interfaces.
- **Integração Robusta**:
  - **WAHA Client**: Implementação de *Retry com Backoff Exponencial* para garantir entrega de mensagens mesmo em instabilidade de rede.
  - **Skill Registry**: Validação rigorosa de skills e registro em lote para inicialização rápida e segura.
  - **Cache Services**: Padrão *Get-Or-Set* para otimizar chamadas de dados e reduzir latência.
- **Whitelist de Usuários**: Apenas números autorizados (configurados no `.env`) podem interagir com o bot.
- **Memória Persistente**: Armazenamento local seguro via SQLite, mantendo o contexto das conversas mesmo após reinicializações.
- **Microserviços**: Arquitetura desacoplada utilizando containers Docker.

## 📈 Roadmap e Planejamento
Consulte o [Plano de Ação da Fase 2](docs/FASE_2_PLAN.md) para detalhes sobre os próximos passos de consolidação, observabilidade e escala.

## 🛠 Tecnologias Utilizadas

- **Runtime**: Node.js & TypeScript
- **WhatsApp API**: [WAHA (WhatsApp HTTP API)](https://waha.devlike.pro/) (Container Docker dedicado).
- **AI Core**: **OpenClaw API** (Principal) & Ollama (Backup).
- **Cache**: Redis (Persistência e alta performance).
- **Tools**: `pdf-parse`, `duck-duck-scrape`, `dotenv`, `axios`.
- **Testes**: Jest (Cobertura de testes unitários para Services, Handlers e Skills).
- **Infraestrutura**: Docker & Docker Compose.

## 📂 Estrutura do Projeto

```
src/
├── config/           # Configurações globais (env, constants)
├── core/
├── handlers/     # Manipuladores de mensagens e eventos
├── interfaces/   # Interfaces abstratas (Clean Architecture)
├── models/       # Modelos de domínio
└── skills/       # Implementação das habilidades (Tools)
├── infrastructure/
├── ai/           # Implementação do serviço de IA (Ollama/OpenAI)
├── database/     # (Futuro) Persistência de dados
├── security/     # Serviços de segurança (Whitelist)
└── whatsapp/     # Cliente WAHA (HTTP API)
└── utils/            # Utilitários gerais (Logger, Formatters)
scripts/              # Scripts de automação e monitoramento
```

## ⚙️ Instalação e Configuração

### Pré-requisitos
- Node.js v18+
- Docker & Docker Compose (Obrigatório para o WAHA)

### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/openclaw-whatsapp-bot.git
cd openclaw-whatsapp-bot
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo e configure suas chaves:
```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```ini
# Servidor
PORT=3002
NODE_ENV=development
LOG_LEVEL=info

# IA (Ollama)
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=llama3

# Persistência
DB_PATH=data/context.db
MAX_CONTEXT_MESSAGES=50

# Segurança
WHITELIST_NUMBERS=5511999999999

# Configuração WAHA
WAHA_BASE_URL=http://localhost:3000
WAHA_API_KEY=sua_chave_secreta
WAHA_DASHBOARD_USERNAME=admin
WAHA_DASHBOARD_PASSWORD=admin
WAHA_WEBHOOK_URL=http://app:3002/webhook

# Google Calendar (Opcional)
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
GOOGLE_REFRESH_TOKEN=seu_refresh_token
```

### 3. Configuração do Google Calendar (Opcional)

Para ativar a integração com o Google Calendar, siga estes passos:

1.  Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2.  Crie um novo projeto e ative a **Google Calendar API**.
3.  Vá em **Credentials** -> **Create Credentials** -> **OAuth Client ID**.
4.  Configure como **Web Application** e adicione o `GOOGLE_REDIRECT_URI` (ex: `https://developers.google.com/oauthplayground` para testes manuais ou seu endpoint de callback).
5.  Obtenha o `Client ID` e `Client Secret`.
6.  Para obter o `Refresh Token`:
    *   Acesse o [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
    *   Selecione a API "Google Calendar API v3" e autorize os escopos (`https://www.googleapis.com/auth/calendar`).
    *   Troque o código de autorização por tokens.
    *   Copie o `Refresh Token` para o seu arquivo `.env`.

### 4. Executar com Docker Compose

Utilize o script de automação para facilitar o processo:

```bash
# Modo de Desenvolvimento (Logs no terminal)
./scripts/run.sh dev

# Modo de Produção (Background)
./scripts/run.sh prod

# Parar serviços
./scripts/run.sh stop
```

Ou manualmente via Docker Compose:

```bash
docker-compose up --build -d
```

### 4. Configurar o WhatsApp (WAHA Dashboard)

O projeto utiliza o **WAHA (WhatsApp HTTP API)** que fornece um painel de controle visual.

1. Acesse o Dashboard: `http://localhost:3000/dashboard`
2. Faça login com as credenciais configuradas no `.env` (Padrão: `admin` / `admin`).
3. Inicie uma sessão chamada `default`.
4. Escaneie o QR Code com seu celular.

### 5. Monitoramento e Saúde

Para verificar se o WAHA está rodando corretamente e se o dashboard está acessível, execute o script de monitoramento:

```bash
./scripts/monitor_dashboard.sh
```

Este script irá:
- Testar a conexão com a API do WAHA.
- Validar o acesso ao Dashboard (incluindo autenticação).
- Listar sessões ativas e status do sistema.

## 🧪 Testes

O projeto possui testes unitários e de integração cobrindo os principais fluxos.
Para executar os testes:

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch
```

## 🐛 Solução de Problemas Comuns (Troubleshooting)

### Dashboard inacessível (401 Unauthorized)
Certifique-se de que as variáveis `WAHA_DASHBOARD_USERNAME` e `WAHA_DASHBOARD_PASSWORD` no `.env` correspondem às configuradas no container WAHA.

### Conflito de Portas
O projeto está configurado para usar:
- Porta **3000**: WAHA (Dashboard e API)
- Porta **3002**: Aplicação Bot (Webhook)
- Porta **11434**: Ollama

Se houver conflito, ajuste as portas no `.env` e no `docker-compose.yml`.

### Bot não responde
1. Verifique se o seu número está na `WHITELIST_NUMBERS`.
2. Verifique os logs da aplicação: `docker-compose logs -f app`.
3. Certifique-se de que a sessão no WAHA está com status `WORKING`.
