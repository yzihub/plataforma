# RTK (Rust Token Killer) — Diagnostico para YZIHUB

**Data:** 2026-04-14
**Fonte:** https://gist.github.com/hudsonbrendon/fc4b6e664e57d3bb5a4e5591ddc9ec40
**Arquivo local:** rtk-guide.md

---

## 1. O que e o RTK

O RTK e um proxy CLI escrito em Rust que intercepta saidas de comandos de desenvolvimento antes que cheguem a janela de contexto do LLM. E um binario unico sem dependencias externas que aplica filtros de compressao automaticamente apos instalacao via `rtk init -g`. Suporta Claude Code, Cursor, Copilot e 10+ ferramentas de IA — incluindo o ambiente atual do YZIHUB.

---

## 2. Estrategias de Reducao de Tokens

O RTK aplica quatro tecnicas combinadas em cada saida de comando:

| Estrategia | Como funciona | Impacto estimado no contexto |
|---|---|---|
| **Smart Filtering** | Remove comentarios, boilerplate e linhas irrelevantes (e.g., warnings verbosos do compilador) | Alto — elimina ruido estrutural |
| **Grouping** | Agrupa arquivos por diretorio e erros por tipo em vez de listar individualmente | Medio-alto — comprime listas longas (ex: `ls`, `find`) |
| **Truncation** | Mantém o inicio e fim do output relevante, corta o meio redundante | Alto em build/test — `next build` tem muitas linhas intermediarias |
| **Deduplication** | Colapsa linhas de log repetidas com contadores (ex: "error X [x47]" em vez de 47 linhas) | Alto em logs — Docker, n8n, curl verbose |

**Resultado combinado (benchmark do proprio RTK):** sessao tipica de 30min no Claude Code: 118.000 tokens → 23.900 tokens (-80%).

---

## 3. Pontos de Consumo de Token no YZIHUB

Mapeamento do workflow atual (baseado em CLAUDE.md e sessoes observadas):

### 3.1 Git (impacto ALTO)
- `git status` em repos com muitos arquivos untracked (`.planning/`, `clientes/`, `docs/`)
- `git diff` em migrações SQL e components TSX longos
- `git log --oneline` com historico denso de quick tasks
- **Contexto YZIHUB:** o repo tem 30+ quick tasks com artefatos — `git status` ja retorna 40+ linhas so de arquivos `??`

### 3.2 Build e Test (impacto ALTO)
- `next build` gera output verboso: route listing, chunk sizes, warnings TS, erros de type
- `pnpm install` / `pnpm list` no onboarding de dependencias
- TypeScript compiler errors (`tsc --noEmit`) geram stacks longas
- **Contexto YZIHUB:** Next.js 15 + Tailwind v4 — build output e extenso

### 3.3 File Listing e Grep (impacto MEDIO)
- `ls -la src/components/yzihub/` durante exploracao de componentes
- `find . -name "*.tsx"` para mapear estrutura
- `grep -r "tenant_id"` em migrações SQL e components
- **Contexto YZIHUB:** pasta `src/components/yzihub/` e `supabase/migrations/` crescem a cada task

### 3.4 Curl e APIs (impacto MEDIO)
- `curl` para testar endpoints Supabase (`/rest/v1/leads`, `/rest/v1/contracts`)
- Respostas JSON brutas de tabelas com muitas colunas
- Debug de webhooks n8n (responses podem ser verbose)
- **Contexto YZIHUB:** payloads N8nEnvelope e dados de contratos/imoveis sao densos

### 3.5 Containers e Infra (impacto BAIXO — atual)
- `docker ps` / `docker logs` se containers locais forem usados
- **Contexto YZIHUB:** ambiente atual e cloud-first (Supabase + n8n cloud) — impacto baixo no presente

---

## 4. Separacao de Camadas (RTK vs Model Routing)

O RTK e o model routing do CLAUDE.md atuam em camadas diferentes e sao **complementares, nao redundantes**:

| Dimensao | RTK | CLAUDE.md Model Routing |
|---|---|---|
| O que comprime | OUTPUT de comandos CLI (tokens de entrada ao LLM) | REASONING do modelo (custo por token de output) |
| Quando age | Antes do contexto chegar ao LLM | Na selecao do modelo para cada tarefa |
| Regra YZIHUB | (novo) RTK intercepta git, build, grep | Haiku para exploracao; Sonnet para arquitetura |
| Complementaridade | Reduz INPUT tokens (context window) | Reduz custo de OUTPUT tokens (faturamento) |

**Conclusao:** usar ambos e a estrategia otima. RTK reduz o tamanho do contexto que chega ao modelo. Model routing reduz o custo de processar esse contexto.

---

## 5. Arquivos Criticos

O RTK nao tem arquivos de configuracao de prompts, agents ou services. E um binario unico com um unico ponto de configuracao:

- **Hook global:** instalado via `rtk init -g` no `.gitconfig` ou shell profile
- **Nenhum arquivo de projeto e modificado** — o RTK e transparente para o repositorio
- **Monitoramento:** `rtk gain` e `rtk discover` permitem auditar economia e oportunidades

---

## 6. Top 3 Otimizacoes para YZIHUB

Ranqueadas por impacto estimado nas sessoes Claude Code do projeto:

### #1 — Git Commands (impacto estimado: 70-80% dos tokens de CLI)

O YZIHUB acumulou 30+ quick tasks com artefatos, 10+ arquivos modificados em staging, e um historico denso. Cada `git status`, `git diff`, ou `git log` retorna output proporcional a esse volume. Com RTK:
- `git status` colapsa untracked files por diretorio (ex: `.planning/quick/` em uma linha em vez de 30)
- `git diff` trunca hunks redundantes mantendo contexto critico
- `git log` agrupa commits por tipo/fase

**Acao:** instalar RTK e executar `rtk init -g` para ativar hook no Claude Code.

### #2 — Next.js Build Output (impacto estimado: 60-70% em sessoes de debug de build)

`next build` no YZIHUB gera: route listing completo, chunk analysis, TypeScript warnings, e potencialmente erros de type verbosos. Com RTK:
- Grouping agrupa erros TS por arquivo
- Truncation mantém apenas os erros iniciais e o resumo final
- Smart Filtering remove progress bars e linhas de status intermediario

**Acao:** coberto pelo hook global — nenhuma configuracao adicional.

### #3 — File Exploration (impacto estimado: 40-50% em sessoes de mapeamento)

Durante sessoes de arquitetura e debug no YZIHUB (ex: "mapear componentes yzihub", "listar migrações"), comandos como `ls`, `find`, e `grep` geram listas longas. Com RTK:
- Grouping comprime output de `ls` por tipo de arquivo
- `find` mostra apenas paths relevantes, agrupados por diretorio pai
- `grep` mostra apenas as linhas com match e contexto minimo

**Acao:** coberto pelo hook global.

---

## 7. Recomendacao

### Instalar? SIM — com ressalva de ambiente

| Criterio | Avaliacao |
|---|---|
| Compatibilidade Windows | **Suportada oficialmente** — o gist lista Windows como plataforma suportada. Instalar via binario pre-compilado (opcao 4) ou Cargo. |
| Risco | **Baixo** — proxy transparente, nao altera codigo do repositorio, nao modifica prompts |
| Esforco de instalacao | **5-10 minutos** — download do binario + `rtk init -g` + restart Claude Code |
| ROI estimado | **60-80% reducao** em tokens de comandos CLI por sessao |
| Reversibilidade | **Total** — `rtk uninit -g` remove o hook sem rastros |

### Instrucoes para Windows (ambiente YZIHUB)

```bash
# Opcao preferida no Windows: baixar binario pre-compilado
# https://github.com/rtk-ai/rtk/releases → escolher rtk-x86_64-pc-windows-msvc.zip

# Extrair e adicionar ao PATH, entao:
rtk init -g

# Verificar instalacao
rtk --version
rtk session

# Monitorar economia apos 1 dia de uso
rtk gain
```

**Alternativa via Cargo** (se Rust estiver instalado):
```bash
cargo install --git https://github.com/rtk-ai/rtk
rtk init -g
```

### Integracao com Workflow GSD

Apos instalar, o RTK age automaticamente em TODOS os comandos Bash dentro do Claude Code. Nenhuma mudanca nos planos GSD, PLAN.md, ou CLAUDE.md e necessaria. O beneficio e imediato e passivo.

---

*Diagnostico gerado em 2026-04-14 a partir de rtk-guide.md (gist hudsonbrendon/fc4b6e664e57d3bb5a4e5591ddc9ec40)*
