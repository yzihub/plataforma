# Producao — Webhook Imoveis

Este documento e o guia operacional unico para colocar o endpoint `POST /api/webhook/imoveis` em producao na Vercel. O endpoint recebe eventos do WordPress (upsert, delete, unpublish) e os persiste na tabela `imoveis` do Supabase. Para funcionar em producao e necessario: gerar um secret novo, configurar a variavel de ambiente na Vercel, e entregar as constantes exatas para o `wp-config.php` do WordPress.

---

## 1. URL publica final

| Dado              | Valor                                                         |
|-------------------|---------------------------------------------------------------|
| URL base          | `https://plataforma.yzihub.com`                               |
| URL do webhook    | `https://plataforma.yzihub.com/api/webhook/imoveis`           |
| Metodo            | `POST`                                                        |
| Header obrigatorio| `Authorization: Bearer <WEBHOOK_IMOVEIS_SECRET>`             |
| Content-Type      | `application/json`                                            |

---

## 2. Gerar secret de producao

**REGRA: NUNCA reusar o secret de desenvolvimento. Producao exige um secret novo e exclusivo.**

O secret deve ser uma string hexadecimal de 64 caracteres (32 bytes aleatorios). Salve o valor gerado em um gerenciador de senhas — ele sera configurado em DOIS lugares: Vercel e `wp-config.php`.

**macOS / Linux:**

```bash
openssl rand -hex 32
```

**Windows PowerShell (opcao 1 — recomendada):**

```powershell
[System.Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
```

**Windows PowerShell (opcao 2 — nativa sem dependencia):**

```powershell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

Resultado esperado: uma string de exatamente 64 caracteres hexadecimais, por exemplo:

```
a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

---

## 3. Configurar WEBHOOK_IMOVEIS_SECRET na Vercel

A variavel `WEBHOOK_IMOVEIS_SECRET` e server-only. **NUNCA** use o prefixo `NEXT_PUBLIC_` — isso exporia o secret no bundle do cliente.

### Opcao A — Dashboard (UI)

1. Acesse [https://vercel.com/dashboard](https://vercel.com/dashboard) e abra o projeto da plataforma.
2. Clique em **Settings** > **Environment Variables**.
3. Clique em **Add New** e preencha:
   - **Name:** `WEBHOOK_IMOVEIS_SECRET`
   - **Value:** cole o secret gerado no passo 2
   - **Environment:** marque **Production** (e opcionalmente **Preview** se quiser testar em preview deploys)
4. Clique em **Save**.
5. Faca o redeploy de producao: va em **Deployments** > clique no ultimo deploy > **Redeploy** (desmarque "Use existing Build Cache" para garantir que a variavel seja carregada).

### Opcao B — CLI

```bash
# Instale a Vercel CLI se ainda nao tiver
npm i -g vercel

# Adicione a variavel de producao (colara o secret quando solicitado interativamente)
vercel env add WEBHOOK_IMOVEIS_SECRET production

# Faca o deploy de producao
vercel --prod
```

---

## 4. Constante WordPress (wp-config.php)

Adicione as duas linhas abaixo no `wp-config.php` do site WordPress, **acima** da linha `/* That's all, stop editing! */`:

```php
define('YZIWS_WEBHOOK_SECRET', 'COLAR_AQUI_O_MESMO_SECRET_DA_VERCEL');
define('YZIWS_WEBHOOK_URL', 'https://plataforma.yzihub.com/api/webhook/imoveis');
```

O snippet do WordPress (a ser instalado na proxima quick task) lera essas constantes para montar o header `Authorization: Bearer <YZIWS_WEBHOOK_SECRET>` e fazer `POST` em `YZIWS_WEBHOOK_URL`.

**REGRA:** O valor de `YZIWS_WEBHOOK_SECRET` deve ser identico ao valor de `WEBHOOK_IMOVEIS_SECRET` configurado na Vercel. Qualquer divergencia causara rejeicao 401.

---

## 5. Checklist pre-ativacao do snippet WordPress

Todos os itens abaixo sao obrigatorios antes de instalar o snippet no WordPress.

- [ ] Secret de producao gerado com `openssl rand -hex 32` (ou equivalente PowerShell), resultado com exatamente 64 caracteres hexadecimais
- [ ] `WEBHOOK_IMOVEIS_SECRET` configurado em **Production** na Vercel (via UI ou CLI)
- [ ] Redeploy de producao executado **apos** adicionar a variavel (a variavel nao e injetada em builds anteriores)
- [ ] Backup do `wp-config.php` feito antes de editar
- [ ] `YZIWS_WEBHOOK_SECRET` definido no `wp-config.php` com o **mesmo valor** configurado na Vercel
- [ ] `YZIWS_WEBHOOK_URL` definido no `wp-config.php` apontando para a URL publica correta
- [ ] Teste sem auth retorna 401 (prova que o endpoint esta no ar e protegido):
  ```bash
  curl -i -X POST https://plataforma.yzihub.com/api/webhook/imoveis \
    -H "Content-Type: application/json" \
    -d '{"evento":"imovel.unpublish","tenant_id":"82cc7aa9-fc6e-4f37-8d8e-8a71c1691361","id_imovel":"TEST"}'
  # Esperado: HTTP/2 401
  ```
- [ ] Teste com auth valida retorna 200 ou 404 (nao 401), provando que o secret esta correto:
  ```bash
  curl -i -X POST https://plataforma.yzihub.com/api/webhook/imoveis \
    -H "Authorization: Bearer SEU_SECRET_AQUI" \
    -H "Content-Type: application/json" \
    -d '{"evento":"imovel.unpublish","tenant_id":"82cc7aa9-fc6e-4f37-8d8e-8a71c1691361","id_imovel":"TEST_NAO_EXISTE"}'
  # Esperado: HTTP/2 200 com {"ok":true,"action":"unpublish","found":false,...}
  ```

---

## 6. Referencia rapida — campos do body

O endpoint aceita os seguintes campos no body JSON:

| Campo       | Tipo     | Obrigatorio         | Descricao                                          |
|-------------|----------|---------------------|----------------------------------------------------|
| `evento`    | string   | Sim                 | `imovel.upsert`, `imovel.delete` ou `imovel.unpublish` |
| `tenant_id` | string   | Sim                 | UUID v4 do tenant (ver abaixo)                     |
| `id_imovel` | string   | Sim (max 100 chars) | Identificador do imovel no WordPress               |
| `data`      | object   | Somente em `upsert` | Campos do imovel a serem salvos/atualizados        |

**Tenants da whitelist:**

| Tenant                                       | Cliente        |
|----------------------------------------------|----------------|
| `b179ae75-3d56-4de8-8840-fc9c4d9ec21e`       | Cafe com Pam   |
| `82cc7aa9-fc6e-4f37-8d8e-8a71c1691361`       | Jurema Brokers |

---

## 7. Proximo passo

Apos completar 100% do checklist acima:

> **Instalar o snippet do WordPress** que dispara `imovel.upsert` / `imovel.delete` / `imovel.unpublish` para `YZIWS_WEBHOOK_URL` usando `YZIWS_WEBHOOK_SECRET` no header de autenticacao. Esse snippet sera o objeto da proxima quick task.

---

## Regras

- NAO usar o secret de dev em producao
- NAO commitar o secret em git (nem em `.env`, nem neste documento)
- NAO instalar o snippet WordPress antes de validar 100% do checklist
- NAO chamar n8n neste fluxo
- NAO mexer manualmente no Supabase para criar/deletar imoveis — use o endpoint
