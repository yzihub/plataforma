# Guia de Instalacao do RTK (Rust Token Killer)

## O que e o RTK?

O RTK e um proxy de linha de comando que reduz o consumo de tokens de LLMs em 60-90% nos comandos mais comuns de desenvolvimento. Ele e um unico binario Rust, sem dependencias, que filtra e comprime as saidas dos comandos antes que elas cheguem a janela de contexto do assistente de IA.

Em uma sessao de 30 minutos no Claude Code, o RTK pode reduzir de ~118.000 tokens para ~23.900 tokens — uma economia de **80%**.

## Estrategias de compressao

- **Smart Filtering**: Remove ruido como comentarios e boilerplate
- **Grouping**: Agrupa itens similares por diretorio ou tipo de erro
- **Truncation**: Mantem contexto relevante enquanto corta redundancia
- **Deduplication**: Colapsa linhas de log repetidas com contadores

## Requisitos

- macOS (x86_64 / ARM64), Linux (x86_64 / ARM64) ou Windows
- Uma das ferramentas de IA suportadas (Claude Code, Cursor, Copilot, Gemini CLI, etc.)

## Instalacao

### Opcao 1: Homebrew (recomendado para macOS/Linux)

```bash
brew install rtk
```

### Opcao 2: Cargo (Rust)

```bash
cargo install --git https://github.com/rtk-ai/rtk
```

### Opcao 3: Script de instalacao rapida

```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
```

O binario sera instalado em `~/.local/bin`. Certifique-se de que esse diretorio esta no seu PATH:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Adicione essa linha ao seu `~/.zshrc` ou `~/.bashrc` para tornar permanente.

### Opcao 4: Binarios pre-compilados

Baixe diretamente da pagina de releases: https://github.com/rtk-ai/rtk/releases

## Configuracao inicial

Apos a instalacao, execute o comando `rtk init` com a flag `-g` (global) para configurar o hook automatico:

### Para Claude Code (padrao)

```bash
rtk init -g
```

### Para Gemini CLI

```bash
rtk init -g --gemini
```

### Para Cursor

```bash
rtk init -g --agent cursor
```

### Outras ferramentas suportadas

O RTK funciona com 10+ ferramentas de IA:

| Ferramenta | Comando |
|---|---|
| Claude Code | `rtk init -g` |
| GitHub Copilot | `rtk init -g` |
| Gemini CLI | `rtk init -g --gemini` |
| Cursor | `rtk init -g --agent cursor` |
| Codex | `rtk init -g --agent codex` |
| Windsurf | `rtk init -g --agent windsurf` |
| Cline/Roo Code | `rtk init -g --agent cline` |

**Reinicie sua ferramenta de IA apos a configuracao.**

## Como funciona

Apos o `rtk init -g`, o RTK instala um hook que reescreve comandos de forma transparente. Por exemplo:

- `git status` vira `rtk git status`
- `ls -la` vira `rtk ls -la`
- `cargo test` vira `rtk cargo test`

A ferramenta de IA nem percebe a transformacao — recebe apenas a saida ja otimizada.

## Mais de 100 comandos suportados

- **Arquivos**: `ls`, `find`, `grep`, `diff`
- **Git**: `status`, `log`, `diff`, `add`, `commit`, `push`, `pull`
- **Testes**: `cargo test`, `pytest`, `npm test`, `go test`
- **Linting**: ESLint, TypeScript, Cargo clippy
- **Build**: `cargo build`, `npm build`, `next build`
- **Pacotes**: `pnpm list`, `pip list`, `bundle install`
- **AWS**: `ec2 describe-instances`, `lambda list-functions`
- **Containers**: `docker ps`, `kubectl pods`, `docker logs`
- **Dados**: JSON parsing, log deduplication, curl/wget

## Monitorando a economia de tokens

```bash
# Resumo geral de economia
rtk gain

# Grafico ASCII dos ultimos 30 dias
rtk gain --graph

# Detalhamento diario
rtk gain --daily

# Encontrar oportunidades de otimizacao
rtk discover

# Metricas de adocao do RTK
rtk session
```

## Flags uteis

| Flag | Descricao |
|---|---|
| `-u, --ultra-compact` | Icones ASCII para economia extra de tokens |
| `-v, --verbose` | Aumenta a verbosidade da saida |

## Verificando a instalacao

```bash
# Verificar se o RTK esta instalado
rtk --version

# Verificar se o hook esta ativo
rtk session
```

## Links

- Repositorio: https://github.com/rtk-ai/rtk
- Releases: https://github.com/rtk-ai/rtk/releases
