# OpenClaw WhatsApp Bot

Assistente de IA autônomo e multimodal integrado ao WhatsApp, projetado para atuar como um "funcionário digital" capaz de executar tarefas complexas, acessar a web, gerenciar arquivos e controlar o sistema operacional através de linguagem natural (texto e voz).

## 🚀 Funcionalidades Principais

### 🧠 Inteligência Artificial & Multimodalidade
- **Processamento de Linguagem Natural**: Integração nativa com **Ollama** (rodando modelos locais como Llama 3, Mistral) para privacidade e independência da OpenAI.
- **Suporte a OpenAI (Legado)**: Possibilidade de reativar a integração com OpenAI via configuração.
- **Visão Computacional**: Suporte a modelos multimodais (como Llama 3.2 Vision ou via OpenAI GPT-4o).
- **Suporte a Voz (Bidirecional)**:
  - **Speech-to-Text (STT)**: Transcrição automática (Nota: Requer configuração de serviço compatível, atualmente desabilitado no modo Ollama local).
  - **Text-to-Speech (TTS)**: Respostas em áudio (Nota: Atualmente desabilitado no modo Ollama local).

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

### 🔒 Segurança & Arquitetura
- **Clean Architecture**: Separação clara entre Core, Infraestrutura e Interfaces.
- **Whitelist de Usuários**: Apenas números autorizados (configurados no `.env`) podem interagir com o bot.
- **Contexto de Conversa**: Gerenciamento de histórico em memória (FIFO) para manter a coerência do diálogo.

## 🛠 Tecnologias Utilizadas

- **Runtime**: Node.js & TypeScript
- **AI Core**: OpenAI API (GPT-4o, Whisper, TTS).
- **Tools**: `pdf-parse`, `duck-duck-scrape`, `dotenv`.
- **Testes**: Jest (Cobertura de testes unitários para Services, Handlers e Skills).
- **Infraestrutura**: Docker & Docker Compose.

## 📂 Estrutura do Projeto

```
src/
├── config/           # Configurações globais (env, constants)
├── core/
│   ├── handlers/     # Manipuladores de mensagens e eventos
│   ├── interfaces/   # Interfaces abstratas (Clean Architecture)
│   ├── models/       # Modelos de domínio
│   └── skills/       # Implementação das habilidades (Tools)
├── infrastructure/
│   ├── ai/           # Implementação do serviço de IA (OpenAI)
│   ├── database/     # (Futuro) Persistência de dados
│   ├── security/     # Serviços de segurança (Whitelist)
│   └── whatsapp/     # Cliente Baileys
└── utils/            # Utilitários gerais (Logger, Formatters)
```

## ⚙️ Instalação e Configuração

### Pré-requisitos
- Node.js v18+
- Docker & Docker Compose (Opcional, mas recomendado)
- Uma conta na OpenAI com créditos (API Key).

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
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# IA (Ollama)
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=llama3

# IA (OpenAI - Opcional)
# OPENAI_API_KEY=sk-proj-...

# Segurança (Números permitidos - Formato Internacional sem +)
# Ex: 55 (Brasil) + DDD + Número
WHITELIST_NUMBERS=5511999999999,5511888888888


# Configuração WAHA
WAHA_BASE_URL=http://localhost:3000
WAHA_API_KEY=secret_key

# Áudio (Habilitar resposta em voz)
AUDIO_RESPONSE_ENABLED=true
```

### 3. Executar com Docker (Recomendado)
```bash
# Construir e subir os containers
docker-compose up --build -d

# Ver logs (para escanear o QR Code)
docker-compose logs -f app
```

### 4. Executar Localmente (Sem Docker)
```bash
npm install
npm run build
npm start
```

## 🧪 Testes

O projeto possui testes unitários e de integração cobrindo os principais fluxos.
Para executar os testes:

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch
```

## � Solução de Problemas Comuns (Troubleshooting)

### Erro 429: "You exceeded your current quota" (OpenAI)
Este erro indica que a chave de API da OpenAI atingiu o limite de uso ou expirou.
**Solução**: Verifique seus créditos na plataforma OpenAI e gere uma nova chave se necessário.

### Conexão Falha com WhatsApp (Connection Failure)
Se o bot não conectar ou ficar reconectando indefinidamente:
1. Verifique se o QR Code foi gerado no terminal/logs.
2. Certifique-se de que o dispositivo celular tem acesso à internet.
3. Se estiver usando Docker, verifique se a rede `openclaw_network` permite saída para a internet.
4. Reinicie o container para forçar uma nova tentativa de conexão: `docker-compose restart app`.

### QR Code não aparece no terminal
Em ambientes Docker/Headless, o QR Code pode ser impresso nos logs.
Execute: `docker-compose logs -f app` e aguarde a mensagem "QR Code recebido".
Se ainda não aparecer, verifique se a variável `printQRInTerminal` está configurada corretamente no código (deve ser `false` para uso com `qrcode-terminal` ou `true` para logs brutos).
