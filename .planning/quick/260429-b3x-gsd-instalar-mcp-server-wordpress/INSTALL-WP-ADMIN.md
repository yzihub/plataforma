# Guia de Instalacao: mcp-wp/mcp-server no WordPress

**Site:** https://juremabksimoveis.com.br  
**Plugin:** mcp-wp/mcp-server (Automattic)  
**Repositorio oficial:** https://github.com/Automattic/mcp-wp

Este guia cobre toda a instalacao manual via WP Admin, sem necessidade de SSH, WP-CLI ou acesso ao servidor.

---

## Pre-requisitos

Antes de comecar, confirme no painel WP Admin:

1. **Versao WordPress >= 6.4** (Application Passwords foram introduzidos no WP 5.6 e amadureceram no 6.x).  
   Verificar em: `WP Admin > Painel > Em uma visao geral` (canto superior esquerdo exibe a versao).

2. **PHP >= 8.0**  
   Verificar em: `WP Admin > Ferramentas > Saude do site > Informacoes > Servidor`.  
   Procurar o campo "Versao do PHP".

3. **Permalinks habilitados (nao usar o modo "simples").**  
   O plugin registra rotas REST e precisa de mod_rewrite ou equivalente ativo.

---

## Parte 1 — Instalar o plugin mcp-wp/mcp-server

Existem duas formas de instalar. Use a **Via A** se o plugin nao aparecer no diretorio oficial do WordPress.org.

### Via A — Upload do arquivo .zip (recomendada)

Esta e a forma mais segura se o plugin ainda nao estiver publicado oficialmente no WordPress.org.

**Passo 1:** Acesse o repositorio oficial do plugin no GitHub:  
`https://github.com/Automattic/mcp-wp/releases`

**Passo 2:** Baixe o arquivo `.zip` do release mais recente (botao "Source code (zip)" ou um asset nomeado `mcp-server.zip` / `mcp-wp.zip`).

**Passo 3:** No WP Admin, va em:  
`Plugins > Adicionar novo > Enviar plugin`

**Passo 4:** Clique em "Escolher arquivo" e selecione o `.zip` baixado.

**Passo 5:** Clique em "Instalar agora".

**Passo 6:** Apos a instalacao, clique em "Ativar plugin".

---

### Via B — Diretorio oficial do WordPress.org (caso publicado)

Use esta via se o plugin ja estiver disponivel no diretorio oficial.

**Passo 1:** Va em `WP Admin > Plugins > Adicionar novo`.

**Passo 2:** No campo de busca, digite `mcp-server` ou `mcp-wp`.

**Passo 3:** Confirme que o autor e **Automattic** antes de instalar (para evitar plugins homônimos).

**Passo 4:** Clique em "Instalar agora" e depois em "Ativar".

---

## Parte 2 — Criar usuario MCP dedicado

Por seguranca, o plugin deve usar um usuario exclusivo com permissoes minimas, sem compartilhar credenciais com administradores humanos.

**Passo 1:** Va em `WP Admin > Usuarios > Adicionar novo`.

**Passo 2:** Preencha os campos:

| Campo | Valor recomendado |
|---|---|
| Nome de usuario | `mcp-bot` |
| Email | Um email tecnico da Jurema (ex.: `dev@juremabksimoveis.com.br`). NAO usar email pessoal. |
| Funcao | **Editor** |

**Passo 3:** Gere uma senha forte no campo "Senha" (ela sera substituida pela Application Password; nao precisa guardar esta).

**Passo 4:** Clique em "Adicionar novo usuario".

> **Por que "Editor" e nao "Administrator"?**  
> A funcao Editor permite criar, editar e publicar posts/CPTs sem acesso a configuracoes do site, plugins e usuarios. Se o MCP server so precisa ler e eventualmente atualizar conteudo, Editor e o minimo suficiente. Nunca use Administrator para integracao automatizada.

---

## Parte 3 — Gerar Application Password

Application Passwords sao tokens de autenticacao gerados pelo WordPress Core (desde WP 5.6). Sao separados da senha do usuario e podem ser revogados individualmente.

**Passo 1:** Va em `WP Admin > Usuarios` e clique em "Editar" no usuario `mcp-bot`.

**Passo 2:** Role a pagina ate a secao **"Senhas de aplicativo"** (Application Passwords).

**Passo 3:** No campo "Nome da nova senha de aplicativo", digite:  
`mcp-server-claude`

**Passo 4:** Clique em "Adicionar nova senha de aplicativo".

**Passo 5:** O WordPress vai exibir o token gerado **uma unica vez**, no formato:  
`xxxx xxxx xxxx xxxx xxxx xxxx`

**IMPORTANTE:** Copie e salve imediatamente esse token em um local seguro (gerenciador de senhas ou arquivo local `.env.mcp` — ver Parte 4 / Task 2). Ele NAO sera mostrado novamente.

**Passo 6:** Clique em "Atualizar usuario" para salvar.

> **Formato do token:** O WordPress gera o Application Password com espacos visuais (`xxxx xxxx xxxx xxxx xxxx xxxx`). Ao usar em HTTP Basic Auth, remova os espacos ou mantenha — ambos funcionam. Os scripts de validacao ja fazem essa normalizacao automaticamente.

---

## Parte 4 — Verificar que o endpoint REST esta ativo

**Passo 1:** Abra no navegador (sem login):  
`https://juremabksimoveis.com.br/wp-json/`

**Passo 2:** O navegador vai exibir um JSON grande. Procure pelo campo `"namespaces"` e verifique se `"mcp/v1"` esta listado.

**Passo 3 (alternativo — mais legivel):** Use uma extensao de formatacao JSON no navegador ou acesse:  
`https://juremabksimoveis.com.br/wp-json/mcp/v1/`  
Sem autenticacao, deve retornar HTTP 401 ou 403 (esperado — endpoint protegido).

---

## Troubleshooting

| Sintoma | Causa provavel | Solucao |
|---|---|---|
| `404` em `/wp-json/mcp/v1/` | Permalinks nao recarregados apos ativar o plugin | Va em `Configuracoes > Links permanentes` e clique "Salvar alteracoes" (sem alterar nada) |
| `401 Unauthorized` sem auth | Comportamento correto — endpoint protegido | Nenhuma acao necessaria |
| `403 Forbidden` com auth | Role insuficiente para o recurso acessado | Verificar se o usuario `mcp-bot` tem role Editor ou superior |
| Plugin desativa sozinho | Conflito ou incompatibilidade PHP | Checar `WP Admin > Ferramentas > Saude do site` e logs de erro do PHP |
| Application Passwords nao aparece | Feature desabilitada por filter | Verificar se algum plugin ou tema chama `add_filter('wp_is_application_passwords_available', '__return_false')` |
| "Namespace mcp/v1 nao encontrado" | Plugin inativo ou falhou na ativacao | Confirmar plugin ativo em `WP Admin > Plugins` |

---

## Checklist final

Marque cada item antes de prosseguir para Task 2 (scripts de validacao):

- [ ] Plugin `mcp-wp/mcp-server` instalado e com status **Ativo** em `WP Admin > Plugins`
- [ ] Usuario `mcp-bot` criado com role **Editor**
- [ ] Application Password `mcp-server-claude` gerada e salva localmente
- [ ] `https://juremabksimoveis.com.br/wp-json/` lista a namespace `"mcp/v1"` no campo `namespaces`

Quando todos os itens estiverem marcados, siga para a Task 2 — scripts de validacao curl/PowerShell.
