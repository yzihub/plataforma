# VALIDATION.md — Checklist de Validacao MCP WordPress

**Status:** Aguardando execucao manual pelo usuario  
**Data prevista:** Apos instalacao do plugin no WP Admin  
**Referencia:** INSTALL-WP-ADMIN.md

---

## Instrucoes de preenchimento

Siga as etapas A–D abaixo. Apos concluir, preencha os checkboxes e cole a saida do script na secao "Resultado do script".

---

## Etapa A — Instalacao no WP Admin

Seguir `INSTALL-WP-ADMIN.md` integralmente.

- [ ] Plugin `mcp-wp/mcp-server` instalado via WP Admin (Via A upload .zip OU Via B diretorio oficial)
- [ ] Plugin com status **Ativo** em `WP Admin > Plugins`
- [ ] Usuario `mcp-bot` criado com role **Editor**
- [ ] Application Password `mcp-server-claude` gerada e salva localmente
- [ ] `https://juremabksimoveis.com.br/wp-json/` lista namespace `"mcp/v1"` no campo `namespaces`

---

## Etapa B — Configurar credenciais locais

```bash
# A partir da raiz do projeto:
cd .planning/quick/260429-b3x-gsd-instalar-mcp-server-wordpress

# Copiar template
cp .env.mcp.example .env.mcp

# Editar e preencher WP_APP_PASSWORD
# (usar editor de texto; NAO commitar o arquivo)
```

- [ ] `.env.mcp` criado a partir de `.env.mcp.example`
- [ ] `WP_APP_PASSWORD` preenchida com o token da Etapa A
- [ ] Confirmado que `.env.mcp` nao sera commitado: `git check-ignore .planning/quick/260429-b3x-gsd-instalar-mcp-server-wordpress/.env.mcp`

---

## Etapa C — Executar script de validacao

**Linux / Mac / Git Bash:**
```bash
cd .planning/quick/260429-b3x-gsd-instalar-mcp-server-wordpress
bash scripts/test-mcp-endpoint.sh
```

**Windows PowerShell:**
```powershell
cd .planning/quick/260429-b3x-gsd-instalar-mcp-server-wordpress
./scripts/test-mcp-endpoint.ps1
```

### Resultado esperado

```
=== 1. Verificar namespace mcp/v1 (sem autenticacao, GET publico) ===
OK: namespace mcp/v1 presente

=== 2. GET /wp-json/mcp/v1/ (autenticado — discovery) ===
HTTP 200
Resposta (primeiros 500 chars):
[JSON de discovery do MCP server]
OK: endpoint MCP autenticado responde 200

=== 3. GET /wp-json/mcp/v1/ (SEM autenticacao — deve retornar 401 ou 403) ===
HTTP 401 (esperado: 401 ou 403)
OK: endpoint protegido (nao acessivel sem autenticacao)

=== Validacao concluida (somente leitura — nenhum conteudo foi alterado) ===
```

---

## Resultado do script (preencher apos execucao)

```
[COLAR SAIDA DO SCRIPT AQUI]
```

---

## Etapa D — Status final

- [ ] Todos os 3 checks do script retornaram OK
- [ ] Nenhum conteudo (posts, paginas, imoveis) foi criado ou alterado

**Resultado:** [ ] SUCESSO  [ ] FALHA

**Notas / erros encontrados:**
```
[descrever aqui se algum check falhou]
```

---

## Proximos passos (apos validacao)

Quando todos os checks passarem:

1. Reportar "validado" para a proxima execucao do Claude Code
2. O Claude criara a configuracao final do Claude Desktop (`config/mcp-wordpress-config.example.json` adaptado)
3. Proxima task definira o escopo de tools MCP autorizadas para a Jurema (somente leitura de imoveis, sem escrita de conteudo)

> **NAO testar nenhuma operacao de escrita (criar/editar/apagar post).** O escopo autorizado e somente leitura e discovery.
