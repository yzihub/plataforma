# Instalacao — Mu-Plugin YZI Webhook Imoveis via SSH

Guia completo de instalacao do snippet PHP `yziws-webhook-imoveis.php` como
**Must-Use Plugin (mu-plugin)** no servidor WordPress da Jurema Brokers via SSH.

> **Status:** Aguardando execucao manual pelo usuario.
> Preencha os placeholders `<...>` com os valores reais do seu ambiente antes de executar.

---

## Antes de Comecar — Dados Necessarios

Reuna os 4 itens abaixo antes de iniciar:

| Item | Exemplo | Onde Encontrar |
|------|---------|----------------|
| Comando SSH | `ssh usuario@host -p 22` | Painel do host / email de boas-vindas |
| Caminho do `wp-config.php` | `/var/www/html/wp-config.php` | Rodar `find / -name wp-config.php 2>/dev/null` no servidor |
| Caminho do `wp-content/` | `/var/www/html/wp-content` | Diretorio irmao do `wp-config.php` |
| Secret `YZIWS_WEBHOOK_SECRET` | (obter da Vercel — variavel `WEBHOOK_IMOVEIS_SECRET`) | Dashboard Vercel > projeto > Settings > Environment Variables |

> **SEGURANCA:** O secret NUNCA deve aparecer em commit, log publico, PR ou chat aberto.
> Use-o apenas ao editar `wp-config.php` diretamente no servidor.

---

## Etapa A — Conectar e Diagnosticar (sem alterar nada)

```bash
# 1. Conectar ao servidor via SSH (terminal local — PowerShell, WSL ou macOS Terminal)
ssh <usuario>@<host>
# Exemplo: ssh deploy@srv123.hostinger.com -p 22
# Exemplo com chave: ssh -i ~/.ssh/jurema_rsa deploy@srv123.hostinger.com

# 2. Localizar wp-config.php caso nao souber o caminho exato
find / -name wp-config.php 2>/dev/null
# Tipicamente: /var/www/html/wp-config.php ou /home/<usuario>/public_html/wp-config.php

# 3. Confirmar que o arquivo existe e verificar permissoes
ls -la <caminho_do_wp_config>
# Esperado: -rw-r--r-- (644) ou similar

# 4. Confirmar que wp-content/ existe ao lado de wp-config.php
ls -la <caminho_do_wp_content>/
# Esperado: listagem com as pastas themes/, plugins/, uploads/
```

---

## Etapa B — Backup do wp-config.php

> **CRITICO:** Nunca editar `wp-config.php` sem fazer backup primeiro.
> Um erro de sintaxe nesse arquivo derruba o site inteiramente.

```bash
# 5. Criar backup com timestamp (rodar no servidor, ja logado via SSH)
TS=$(date +%Y%m%d-%H%M%S)
cp <caminho_do_wp_config> <caminho_do_wp_config>.bak.$TS

# Exemplo:
# cp /var/www/html/wp-config.php /var/www/html/wp-config.php.bak.20260502-143000

# 6. Confirmar que o backup foi criado
ls -la <caminho_do_wp_config>.bak.*
# Esperado: arquivo listado com tamanho identico ao original
```

**Anotar o timestamp gerado** — sera usado na documentacao e no rollback.

---

## Etapa C — Criar Diretorio mu-plugins (se nao existir)

```bash
# 7. Verificar se o diretorio mu-plugins ja existe
ls -la <caminho_do_wp_content>/mu-plugins 2>/dev/null
# Se listar arquivos: diretorio ja existe, pular o passo 8 e 9.
# Se retornar erro "No such file or directory": criar conforme abaixo.

# 8. Criar o diretorio mu-plugins
mkdir -p <caminho_do_wp_content>/mu-plugins

# 9. Definir owner identico ao wp-content e permissoes 755
OWNER=$(stat -c '%U:%G' <caminho_do_wp_content>)
chown $OWNER <caminho_do_wp_content>/mu-plugins
chmod 755 <caminho_do_wp_content>/mu-plugins

# 10. Confirmar criacao
ls -la <caminho_do_wp_content>/mu-plugins
# Esperado: diretorio com permissoes drwxr-xr-x e owner correto
```

---

## Etapa D — Copiar o Snippet para mu-plugins

### Opcao 1 — via `scp` do Terminal Local (Recomendado)

Execute este comando no **terminal local** (nao no servidor):

```bash
# Do terminal local (PowerShell, WSL ou macOS Terminal):
scp ".planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php" \
    <usuario>@<host>:<caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php

# Exemplo com porta customizada:
# scp -P 2222 ".planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php" \
#     deploy@srv123.hostinger.com:/var/www/html/wp-content/mu-plugins/yziws-webhook-imoveis.php

# Se usar chave SSH:
# scp -i ~/.ssh/jurema_rsa ".planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php" \
#     deploy@srv123.hostinger.com:/var/www/html/wp-content/mu-plugins/yziws-webhook-imoveis.php
```

### Opcao 2 — via Painel de Hospedagem (File Manager)

Se o `scp` nao estiver disponivel:

1. Acessar o painel da hospedagem (cPanel, Plesk, Hostinger hPanel, etc.).
2. Abrir o **Gerenciador de Arquivos** (File Manager).
3. Navegar ate `wp-content/mu-plugins/`.
4. Fazer upload do arquivo `yziws-webhook-imoveis.php` localizado em:
   `.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/`

### Opcao 3 — via heredoc inline no SSH (ultimo recurso)

Use apenas se `scp` e painel nao estiverem disponiveis.
O arquivo tem 373 linhas — usar `scp` e muito mais seguro.

```bash
# Logado no servidor:
nano <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php
# Colar o conteudo INTEGRAL do arquivo yziws-webhook-imoveis.php
# Salvar: Ctrl+O, Enter, Ctrl+X
```

---

## Etapa E — Definir Permissoes do Arquivo

```bash
# 11. Ajustar owner e permissoes do arquivo (rodar no servidor)
OWNER=$(stat -c '%U:%G' <caminho_do_wp_content>)
chown $OWNER <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php
chmod 644 <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php

# 12. Validar sintaxe PHP (CRITICO — detecta erros de colagem antes que o WordPress carregue)
php -l <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php
# Esperado: "No syntax errors detected in <caminho>/yziws-webhook-imoveis.php"

# 13. Confirmar tamanho do arquivo (deve ter ~373 linhas, ~12-13KB)
wc -l <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php
# Esperado: cerca de 373 linhas
```

---

## Etapa F — Adicionar Constantes no wp-config.php

> **ATENCAO:** Adicionar as 2 linhas abaixo **IMEDIATAMENTE ANTES** da linha:
> `/* That's all, stop editing! Happy publishing. */`
> Nunca apos essa linha — o WordPress para de ler o arquivo depois dela.

```bash
# 14. Abrir o wp-config.php para edicao
nano <caminho_do_wp_config>
# ou: vi <caminho_do_wp_config>
```

Inserir as 2 linhas antes de `/* That's all, stop editing! */`:

```php
define('YZIWS_WEBHOOK_URL', 'https://plataforma.yzihub.com/api/webhook/imoveis');
define('YZIWS_WEBHOOK_SECRET', 'SEU_SECRET_AQUI');
```

> Substituir `SEU_SECRET_AQUI` pelo valor real obtido da Vercel (`WEBHOOK_IMOVEIS_SECRET`).
> O secret deve ser identico nos dois lugares ou o endpoint retornara HTTP 401.

Salvar e sair:
- `nano`: `Ctrl+O`, `Enter`, `Ctrl+X`
- `vi`: `Esc`, `:wq`, `Enter`

---

## Etapa G — Validar wp-config.php Apos Edicao

```bash
# 15. Validar sintaxe PHP do wp-config.php (CRITICO — erro aqui derruba o site)
php -l <caminho_do_wp_config>
# Esperado: "No syntax errors detected in <caminho>/wp-config.php"

# 16. Confirmar que as constantes foram adicionadas (sem exibir o valor do secret)
grep -n "YZIWS_WEBHOOK_URL\|YZIWS_WEBHOOK_SECRET" <caminho_do_wp_config>
# Esperado: 2 linhas — uma com a URL e outra com o nome da constante SECRET
# Exemplo de saida OK:
#   123:define('YZIWS_WEBHOOK_URL', 'https://plataforma.yzihub.com/api/webhook/imoveis');
#   124:define('YZIWS_WEBHOOK_SECRET', '...');
```

---

## Etapa H — Validacao Final da Instalacao

```bash
# 17. Confirmar que o mu-plugin esta no lugar correto
ls -la <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php
# Esperado: -rw-r--r-- (644) com owner correto e tamanho ~12-13KB

# 18. Confirmar que o backup existe
ls -la <caminho_do_wp_config>.bak.*
# Esperado: arquivo bak com mesmo tamanho do wp-config.php atual

# 19. Verificar no wp-admin
# 1. Acessar: https://<dominio-wordpress>/wp-admin
# 2. Ir em: Plugins > Must-Use (aba)
# 3. Confirmar que "YZI Webhook Sync — Imoveis" aparece listado como sempre ativo
# 4. Confirmar que NAO ha botao Activate/Deactivate (mu-plugins sao sempre ativos)
```

---

## Checklist de Conclusao

Marcar cada item apos confirmar:

- [ ] Backup `wp-config.php.bak.<timestamp>` criado e listado via `ls -la`
- [ ] Diretorio `wp-content/mu-plugins/` existe com permissoes `755`
- [ ] Arquivo `yziws-webhook-imoveis.php` instalado em `mu-plugins/` com permissoes `644`
- [ ] `php -l yziws-webhook-imoveis.php` retorna "No syntax errors detected"
- [ ] `php -l wp-config.php` retorna "No syntax errors detected"
- [ ] `grep` em `wp-config.php` retorna 2 linhas (URL + SECRET)
- [ ] Site WordPress carrega normalmente no navegador (frontend e wp-admin)
- [ ] `wp-admin > Plugins > Must-Use` mostra "YZI Webhook Sync — Imoveis"
- [ ] Nenhum imovel foi criado/editado para teste — proximo passo separado

---

## Rollback — Como Reverter em Caso de Problema

Se algo der errado (site quebrando, erro de PHP, etc.):

```bash
# Restaurar wp-config.php do backup
cp <caminho_do_wp_config>.bak.<timestamp> <caminho_do_wp_config>

# Remover o mu-plugin
rm <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php

# Validar restauracao
php -l <caminho_do_wp_config>
# Esperado: "No syntax errors detected"
```

O site deve voltar ao normal imediatamente apos restaurar o `wp-config.php`.

---

## Proximo Passo (NAO executar agora)

Apos confirmar que o mu-plugin esta instalado e o site funcionando:

1. **Configurar secret na Vercel** (se ainda nao feito):
   - Acessar https://vercel.com/dashboard > projeto > Settings > Environment Variables
   - Adicionar: `WEBHOOK_IMOVEIS_SECRET` = `<mesmo valor usado em wp-config.php>`
   - Fazer redeploy do projeto na Vercel para aplicar a variavel

2. **Testar com 1 imovel real**:
   - Acessar `wp-admin` > Imoveis
   - Abrir qualquer imovel ja publicado
   - Fazer uma pequena alteracao (ex: espaco no titulo)
   - Clicar Atualizar
   - Verificar log do endpoint `POST /api/webhook/imoveis` na Vercel

3. **Confirmar no Supabase**:
   - Tabela `imoveis` deve ter o campo `updated_at` atualizado para o imovel editado

---

## Informacoes do Snippet Instalado

| Campo | Valor |
|-------|-------|
| Nome | YZI Webhook Sync — Imoveis |
| Versao | 1.0.0 |
| Tipo | Must-Use Plugin (mu-plugins/) |
| CPT monitorado | `imoveis` (configuravel via `YZIWS_CPT`) |
| Tenant | `82cc7aa9-fc6e-4f37-8d8e-8a71c1691361` (Jurema Brokers, hardcoded) |
| Endpoint destino | `https://plataforma.yzihub.com/api/webhook/imoveis` |
| Autenticacao | Bearer token (constante `YZIWS_WEBHOOK_SECRET`) |
| Eventos | `imovel.upsert`, `imovel.unpublish`, `imovel.delete` |
| Hooks | `save_post`, `transition_post_status`, `before_delete_post` |
| Timeout | 10 segundos (bloqueante) |
| Arquivo fonte | `.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php` |

---

## Registro de Execucao

> Preencher apos concluir os comandos acima.

| Campo | Valor |
|-------|-------|
| Data/hora da instalacao | `____-__-__ __:__:__ UTC` |
| Timestamp do backup | `wp-config.php.bak.__________` |
| Caminho wp-config.php | `/___/___/wp-config.php` |
| Caminho mu-plugin | `/___/___/wp-content/mu-plugins/yziws-webhook-imoveis.php` |
| `php -l` mu-plugin | `No syntax errors detected` / erro: _______ |
| `php -l` wp-config | `No syntax errors detected` / erro: _______ |
| Constantes presentes (`grep`) | `sim (2 linhas)` / nao |
| Site carrega normalmente | `sim` / nao |
| Must-Use listado em wp-admin | `sim` / nao |
| Executado por | `_______________` |
