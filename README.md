# OpenClaw WhatsApp Bot

## Visão Geral
Assistente de IA autônomo baseado no ecossistema OpenClaw, integrado diretamente ao WhatsApp. Este projeto visa criar um "funcionário digital" capaz de executar tarefas no sistema, acessar a web e gerenciar ferramentas de produtividade.

## Objetivos
Permitir que o usuário controle seu computador, gerencie e-mails, arquivos e automações através de mensagens de voz ou texto no WhatsApp.

## Funcionalidades Principais
- **Conexão via QR Code**: Vinculação com WhatsApp Web via Baileys.
- **Suporte a Mensagens de Voz**: Integração com modelos Speech-to-Text.
- **Suporte a Arquivos**: Processamento de documentos (PDF, CSV, Imagens).
- **Cérebro e Lógica**: Integração com LLMs (OpenAI, Claude, Ollama).
- **Sistema de Skills**: Execução de comandos, pesquisa web, gerenciamento de arquivos.

## Requisitos Técnicos
- **Backend**: Node.js
- **Infraestrutura**: Docker
- **Banco de Dados**: SQLite/PostgreSQL

## Como Rodar
1. Clone o repositório.
2. Instale as dependências: `npm install`.
3. Configure o arquivo `.env`.
4. Inicie o servidor: `npm run dev`.
