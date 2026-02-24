# OpenClaw WhatsApp Bot

Assistente de IA autônomo e multimodal integrado ao WhatsApp, projetado para atuar como um "funcionário digital" capaz de executar tarefas complexas, acessar a web, gerenciar arquivos e controlar o sistema operacional através de linguagem natural (texto e voz).

## 🚀 Funcionalidades Principais

### 🧠 Inteligência Artificial & Multimodalidade
- **Processamento de Linguagem Natural**: Integração com **OpenAI GPT-4o** para compreensão profunda de contexto e instruções.
- **Visão Computacional**: Capacidade de analisar e descrever imagens enviadas pelo usuário (ex: "O que tem nesta foto?", "Extraia os dados desta planilha").
- **Suporte a Voz (Bidirecional)**:
  - **Speech-to-Text (STT)**: Transcrição automática de áudios recebidos via WhatsApp usando **Whisper**.
  - **Text-to-Speech (TTS)**: Respostas em áudio sintético natural (configurável via `.env`).

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
- **WhatsApp API**: [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) (Não requer API oficial Business).
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

# IA (OpenAI)
OPENAI_API_KEY=sk-proj-...

# Segurança (Números permitidos - Formato Internacional sem +)
# Ex: 55 (Brasil) + DDD + Número
WHITELIST_NUMBERS=5511999999999,5511888888888

# WhatsApp Session (Onde salvar as credenciais)
WHATSAPP_SESSION_PATH=./auth_info_baileys

# Áudio (Habilitar resposta em voz)
AUDIO_RESPONSE_ENABLED=true
```

### 3. Executar com Docker (Recomendado)
```bash
# Construir e subir os containers
docker-compose up --build -d

# Acompanhar os logs para escanear o QR Code
docker-compose logs -f app
```

### 4. Executar Localmente (Desenvolvimento)
```bash
# Instalar dependências
npm install

# Rodar em modo de desenvolvimento
npm run dev

# Rodar testes
npm test
```

## 📱 Como Usar

1. Ao iniciar, o terminal exibirá um **QR Code**.
2. Abra o WhatsApp no seu celular, vá em **Aparelhos Conectados** > **Conectar um aparelho**.
3. Escaneie o QR Code.
4. Envie mensagens para o bot a partir de um número autorizado na Whitelist.

### Exemplos de Comandos
- **Texto**: "Crie um resumo sobre a Revolução Industrial."
- **Imagem**: Envie uma foto e pergunte "O que você vê nesta imagem?" ou "Transcreva o texto desta foto."
- **Arquivos**: Envie um PDF e peça "Resuma este documento."
- **Busca Web**: "Pesquise o preço atual do Bitcoin."
- **Terminal**: "Liste os arquivos do diretório atual." (Se permitido na whitelist de comandos).
- **Áudio**: Envie uma mensagem de voz; o bot ouvirá e responderá (em texto ou áudio, conforme config).

## 🤝 Contribuição

1. Faça um Fork do projeto.
2. Crie uma Branch para sua Feature (`git checkout -b feat/AmazingFeature`).
3. Commit suas mudanças (`git commit -m 'feat: Add some AmazingFeature'`).
4. Push para a Branch (`git push origin feat/AmazingFeature`).
5. Abra um Pull Request.

## 📄 Licença

Distribuído sob a licença ISC. Veja `LICENSE` para mais informações.
