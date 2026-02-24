# Guia de Configuração do Repositório GitHub

Este documento detalha as configurações manuais necessárias para garantir a segurança e o fluxo de trabalho correto deste repositório. Como estas configurações não podem ser automatizadas via código (Infrastructure as Code) sem privilégios administrativos de API, elas devem ser aplicadas manualmente pelo administrador do repositório.

## 1. Configuração da Branch Padrão

A branch `develop` deve ser a branch padrão para novos Pull Requests e visualização de código.

1.  Acesse a página do repositório no GitHub.
2.  Navegue até **Settings** → **Branches**.
3.  Localize a seção "Default branch".
4.  Clique no ícone de lápis/troca e altere de `main` para `develop`.
5.  Confirme a mudança.

## 2. Regras de Proteção de Branch (Branch Protection Rules)

Proteja as branches críticas para evitar commits diretos e garantir revisão de código.

### Para a branch `main` (Produção):

1.  Em **Settings** → **Branches**, clique em **Add branch protection rule**.
2.  **Branch name pattern**: `main`
3.  Marque as seguintes opções:
    *   [x] **Require a pull request before merging**
    *   [x] **Require approvals** (Mínimo: 2)
    *   [x] **Dismiss stale pull request approvals when new commits are pushed**
    *   [x] **Require status checks to pass before merging** (Selecione o workflow de CI `build`)
    *   [x] **Require conversation resolution before merging**
4.  Clique em **Create** / **Save changes**.

### Para a branch `develop` (Integração):

1.  Repita o processo clicando em **Add branch protection rule**.
2.  **Branch name pattern**: `develop`
3.  Aplique as mesmas configurações da `main`.

## 3. Configuração de Secrets (GitHub Actions)

O workflow de CI/CD necessita de variáveis de ambiente sensíveis para executar testes de integração e deploy.

1.  Acesse **Settings** → **Secrets and variables** → **Actions**.
2.  Clique em **New repository secret**.
3.  Adicione os seguintes segredos (conforme necessário pelo projeto):

    | Nome do Secret | Descrição |
    | :--- | :--- |
    | `OPENAI_API_KEY` | Chave de API da OpenAI para testes de integração com LLM. |
    | `ANTHROPIC_API_KEY` | Chave de API da Anthropic. |
    | `WHATSAPP_SESSION_KEY` | (Opcional) Chave para descriptografia de sessão em CI, se aplicável. |

4.  O workflow `.github/workflows/ci.yml` já está configurado para ler estas chaves automaticamente.

## 4. Verificação

Após configurar:
1.  Tente fazer um push direto para `main` ou `develop` (deve ser bloqueado).
2.  Crie um Pull Request e verifique se o check de CI (`build`) inicia automaticamente.
