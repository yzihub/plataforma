---
phase: quick-260502-dnq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260502-dnq-instalar-webhook-wordpress-mu-plugin/INSTALACAO-MU-PLUGIN.md
autonomous: false
requirements:
  - QUICK-260502-DNQ
user_setup:
  - service: wordpress-jurema-ssh
    why: "Instalar mu-plugin via SSH no servidor WordPress da Jurema Brokers"
    env_vars:
      - name: YZIWS_WEBHOOK_SECRET
        source: "Vercel (variavel WEBHOOK_IMOVEIS_SECRET) — usuario fornece o valor"
      - name: YZIWS_WEBHOOK_URL
        source: "Hardcoded — https://plataforma.yzihub.com/api/webhook/imoveis"
    dashboard_config:
      - task: "Acesso SSH ao host WordPress (caminho do wp-config.php e wp-content)"
        location: "Painel/host do WordPress da Jurema Brokers"

must_haves:
  truths:
    - "Backup do wp-config.php existe no servidor antes de qualquer alteracao"
    - "Diretorio wp-content/mu-plugins/ existe no servidor"
    - "Arquivo yziws-webhook-imoveis.php esta instalado em wp-content/mu-plugins/"
    - "Constantes YZIWS_WEBHOOK_URL e YZIWS_WEBHOOK_SECRET estao definidas no wp-config.php"
    - "Snippet esta carregado sem erros de PHP (php -l ou checagem visual no wp-admin)"
    - "Nenhum imovel foi disparado/testado nesta etapa"
  artifacts:
    - path: "wp-config.php (no servidor WordPress)"
      provides: "Constantes YZIWS_WEBHOOK_URL e YZIWS_WEBHOOK_SECRET"
      contains: "define('YZIWS_WEBHOOK_URL', ...) e define('YZIWS_WEBHOOK_SECRET', ...)"
    - path: "wp-config.php.bak.{timestamp} (no servidor WordPress)"
      provides: "Backup do wp-config.php pre-alteracao"
    - path: "wp-content/mu-plugins/yziws-webhook-imoveis.php (no servidor WordPress)"
      provides: "Mu-plugin que dispara webhooks ao salvar/atualizar imoveis"
    - path: ".planning/quick/260502-dnq-instalar-webhook-wordpress-mu-plugin/INSTALACAO-MU-PLUGIN.md"
      provides: "Guia local de comandos SSH executados, backups e como validar"
  key_links:
    - from: "wp-config.php"
      to: "wp-content/mu-plugins/yziws-webhook-imoveis.php"
      via: "constantes YZIWS_WEBHOOK_SECRET e YZIWS_WEBHOOK_URL"
      pattern: "define\\('YZIWS_WEBHOOK_(SECRET|URL)'"
    - from: "wp-content/mu-plugins/yziws-webhook-imoveis.php"
      to: "https://plataforma.yzihub.com/api/webhook/imoveis"
      via: "wp_remote_post com Authorization Bearer"
      pattern: "wp_remote_post.*YZIWS_WEBHOOK_URL"
---

<objective>
Instalar o snippet PHP `yziws-webhook-imoveis.php` como mu-plugin no servidor WordPress da Jurema Brokers via SSH, com backup do `wp-config.php` e definicao das constantes `YZIWS_WEBHOOK_URL` e `YZIWS_WEBHOOK_SECRET`.

Purpose: Habilitar o disparo automatico de webhooks (`imovel.upsert`, `imovel.unpublish`, `imovel.delete`) do WordPress para o endpoint `POST /api/webhook/imoveis` da plataforma YZI Hub, sem ainda testar nenhum imovel.

Output:
- Backup do `wp-config.php` no servidor WordPress (`wp-config.php.bak.{timestamp}`)
- Arquivo `wp-content/mu-plugins/yziws-webhook-imoveis.php` instalado
- Constantes `YZIWS_WEBHOOK_URL` e `YZIWS_WEBHOOK_SECRET` definidas em `wp-config.php`
- Documento local `INSTALACAO-MU-PLUGIN.md` com comandos executados, evidencias e proximo passo

Boundaries (NAO fazer nesta etapa):
- NAO mexer na Vercel (sera feito pelo usuario)
- NAO usar n8n
- NAO mexer em Supabase
- NAO testar criando/editando imovel (proximo passo)
- NAO expor secret em commit nem em snippet PHP
- NAO modificar o conteudo do snippet PHP (apenas copiar)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php
@.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/INSTALACAO.md
@.planning/quick/260501-vnn-corrigir-snippet-final-im-veis/260501-vnn-SUMMARY.md

<interfaces>
<!-- Constantes esperadas no wp-config.php para o snippet funcionar. -->
<!-- O snippet ja foi corrigido em quick-260501-vnn (CPT default 'imoveis', fallback codigo-do-imovel). -->

Constantes obrigatorias (devem ser adicionadas no wp-config.php ANTES da linha
"/* That's all, stop editing! */"):

```php
define('YZIWS_WEBHOOK_URL', 'https://plataforma.yzihub.com/api/webhook/imoveis');
define('YZIWS_WEBHOOK_SECRET', 'COLAR_O_SECRET_FORNECIDO_PELO_USUARIO');
// Opcional — apenas se o CPT NAO for 'imoveis' (default ja correto):
// define('YZIWS_CPT', 'imoveis');
```

Tenant hardcoded no snippet (NAO alterar):

```
YZIWS_TENANT_ID = '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361'  // Jurema Brokers
```

Hooks WordPress registrados pelo snippet:

```php
add_action('save_post',              'yziws_on_save_post',              10, 3);
add_action('transition_post_status', 'yziws_on_transition_post_status', 10, 3);
add_action('before_delete_post',     'yziws_on_before_delete_post',     10, 1);
```

Diferencas chave entre Code Snippets plugin e mu-plugin:
- mu-plugin (Must-Use Plugin): arquivo PHP em wp-content/mu-plugins/ carregado
  automaticamente pelo WordPress, sempre ativo, sem necessidade de plugin externo.
- mu-plugin REQUER a tag `<?php` de abertura no inicio do arquivo (ja presente no snippet).
- mu-plugin NAO precisa de header de plugin formal, mas o snippet ja inclui phpdoc.
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Coletar dados de SSH e secret antes de comecar</name>
  <what-needed>
    Antes de executar qualquer comando no servidor WordPress, o usuario precisa fornecer:

    1. **Comando SSH completo** para acessar o servidor WordPress da Jurema Brokers
       (ex: `ssh usuario@host -p porta` ou `ssh -i ~/.ssh/key usuario@host`).

    2. **Caminho absoluto do wp-config.php** no servidor (ex: `/var/www/html/wp-config.php`
       ou `/home/usuario/public_html/wp-config.php`).
       Caso o usuario nao saiba, instrucao: rodar `find / -name wp-config.php 2>/dev/null`
       depois de logado via SSH.

    3. **Caminho absoluto do wp-content/** (geralmente o diretorio irmao do wp-config.php).

    4. **Valor do secret** `YZIWS_WEBHOOK_SECRET` que sera colado em `wp-config.php`.
       O valor DEVE ser identico ao da variavel `WEBHOOK_IMOVEIS_SECRET` configurada
       (ou a ser configurada) na Vercel pelo usuario.

    Regras de seguranca:
    - O secret NAO deve aparecer em commit, em PR, em chat publico ou em logs.
    - O secret deve ser passado via mensagem direta no chat e usado apenas durante a execucao.
    - O secret NAO deve ser embutido no arquivo `yziws-webhook-imoveis.php` — sempre em `wp-config.php`.
  </what-needed>
  <how-to-verify>
    Usuario respondeu na conversa com:
    - comando SSH funcional
    - caminho absoluto do wp-config.php
    - caminho absoluto do wp-content/
    - valor do secret (texto plano, sera usado e nunca commitado)
  </how-to-verify>
  <resume-signal>Cole no chat: comando SSH, caminhos, e o secret. Depois diga "prosseguir".</resume-signal>
</task>

<task type="auto">
  <name>Task 2: Backup do wp-config.php, criar mu-plugins e instalar snippet via SSH</name>
  <files>
    - servidor:wp-config.php (modificacao)
    - servidor:wp-config.php.bak.{timestamp} (novo)
    - servidor:wp-content/mu-plugins/ (novo, se nao existir)
    - servidor:wp-content/mu-plugins/yziws-webhook-imoveis.php (novo)
    - .planning/quick/260502-dnq-instalar-webhook-wordpress-mu-plugin/INSTALACAO-MU-PLUGIN.md (novo, local)
  </files>
  <action>
    Executar a sequencia de comandos SSH abaixo no servidor WordPress da Jurema Brokers,
    usando os dados coletados na Task 1 (substituir placeholders entre `<...>`).

    Estrategia: comandos sao apresentados ao usuario para que ele execute via SSH (manual)
    OU para que Claude execute via Bash tool localmente quando o terminal local tem
    acesso SSH configurado. Preferir execucao manual pelo usuario quando o ambiente
    Windows/PowerShell nao tiver chave SSH pronta.

    **Etapa A — Conectar e diagnosticar (sem alterar):**

    ```bash
    # 1. Conectar via SSH (no terminal local do usuario)
    ssh <usuario>@<host>

    # 2. Localizar wp-config.php e wp-content/ (caso usuario nao tenha confirmado)
    find / -name wp-config.php 2>/dev/null
    ls -la <caminho_do_wp_config>
    ls -la <caminho_do_wp_content>
    ```

    **Etapa B — Backup do wp-config.php:**

    ```bash
    # 3. Criar backup com timestamp
    TS=$(date +%Y%m%d-%H%M%S)
    cp <caminho_do_wp_config> <caminho_do_wp_config>.bak.$TS

    # 4. Confirmar backup criado
    ls -la <caminho_do_wp_config>.bak.$TS
    ```

    **Etapa C — Criar diretorio mu-plugins se nao existir:**

    ```bash
    # 5. Verificar se mu-plugins existe
    ls -la <caminho_do_wp_content>/mu-plugins 2>/dev/null

    # 6. Criar mu-plugins se nao existir, com permissoes apropriadas
    mkdir -p <caminho_do_wp_content>/mu-plugins
    # Definir owner igual ao do wp-content (geralmente www-data:www-data ou usuario do PHP-FPM)
    # Detectar owner do wp-content e replicar:
    OWNER=$(stat -c '%U:%G' <caminho_do_wp_content>)
    chown $OWNER <caminho_do_wp_content>/mu-plugins
    chmod 755 <caminho_do_wp_content>/mu-plugins
    ```

    **Etapa D — Copiar snippet para mu-plugins:**

    Opcao 1 — via `scp` do terminal local (recomendado):
    ```bash
    # Do terminal local do usuario (Windows PowerShell ou WSL):
    scp ".planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php" \
        <usuario>@<host>:<caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php
    ```

    Opcao 2 — via heredoc inline no SSH (caso scp nao esteja disponivel):
    ```bash
    # Logado no servidor, usar nano/vi para criar o arquivo e colar o conteudo INTEGRAL
    # do snippet (370+ linhas — preferir scp)
    nano <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php
    ```

    Apos copiar:
    ```bash
    # Permissoes do arquivo: 644, owner igual ao do wp-content
    chown $OWNER <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php
    chmod 644 <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php

    # Validar sintaxe PHP (se php CLI estiver disponivel)
    php -l <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php
    # Esperado: "No syntax errors detected in ..."
    ```

    **Etapa E — Adicionar constantes em wp-config.php:**

    O usuario devera editar o `wp-config.php` adicionando as 2 linhas abaixo
    IMEDIATAMENTE ANTES da linha `/* That's all, stop editing! Happy publishing. */`:

    ```php
    define('YZIWS_WEBHOOK_URL', 'https://plataforma.yzihub.com/api/webhook/imoveis');
    define('YZIWS_WEBHOOK_SECRET', '<VALOR_DO_SECRET_FORNECIDO_PELO_USUARIO>');
    ```

    Comando para editar:
    ```bash
    # Usar editor de preferencia
    nano <caminho_do_wp_config>
    # ou
    vi <caminho_do_wp_config>
    ```

    Apos salvar:
    ```bash
    # Validar sintaxe PHP do wp-config.php (CRITICO — erro aqui derruba o site)
    php -l <caminho_do_wp_config>
    # Esperado: "No syntax errors detected in ..."

    # Confirmar que as constantes foram adicionadas (sem expor o valor)
    grep -E "YZIWS_WEBHOOK_(URL|SECRET)" <caminho_do_wp_config>
    # Esperado: 2 linhas, uma com a URL e outra com o nome do secret (valor visivel apenas no servidor)
    ```

    **Etapa F — Validar instalacao do mu-plugin:**

    ```bash
    # Confirmar que o arquivo esta no lugar
    ls -la <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php

    # Validar tamanho aproximado (deve ter >300 linhas, ~12-13KB)
    wc -l <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php
    # Esperado: cerca de 372 linhas

    # Confirmar carregamento via wp-admin (manualmente):
    # Acessar wp-admin > Plugins > Must-Use (aba)
    # Esperado: "YZI Webhook Sync — Imoveis" listado, sempre ativo
    ```

    **Etapa G — Documentar localmente (no projeto):**

    Criar `.planning/quick/260502-dnq-instalar-webhook-wordpress-mu-plugin/INSTALACAO-MU-PLUGIN.md`
    com:
    - Data e hora da instalacao
    - Caminho do backup (`wp-config.php.bak.{timestamp}`)
    - Caminho do mu-plugin instalado
    - Confirmacao de que as constantes foram adicionadas (SEM colar o valor do secret)
    - Output dos comandos `php -l` (validacao de sintaxe)
    - Output do `grep` confirmando presenca das constantes
    - Como reverter (instrucao `cp <bak> <wp-config.php>` e `rm <mu-plugin>`)

    **NAO commitar o secret em lugar nenhum.**
    **NAO testar criando/editando imovel — proximo passo (etapa fora deste plano).**

    Razao da abordagem:
    - mu-plugin garante que o snippet sempre carrega (nao depende de plugin Code Snippets)
    - backup obrigatorio porque alteracao em `wp-config.php` mal feita derruba o site
    - validacao `php -l` previne deploy de sintaxe quebrada
    - documentacao local INSTALACAO-MU-PLUGIN.md serve como evidencia para auditoria
  </action>
  <verify>
    <automated>
    No servidor (via SSH):
    test -f &lt;caminho_do_wp_content&gt;/mu-plugins/yziws-webhook-imoveis.php &amp;&amp; \
    php -l &lt;caminho_do_wp_content&gt;/mu-plugins/yziws-webhook-imoveis.php &amp;&amp; \
    php -l &lt;caminho_do_wp_config&gt; &amp;&amp; \
    grep -c "YZIWS_WEBHOOK_URL\|YZIWS_WEBHOOK_SECRET" &lt;caminho_do_wp_config&gt; &amp;&amp; \
    ls -la &lt;caminho_do_wp_config&gt;.bak.*

    No projeto local:
    test -f .planning/quick/260502-dnq-instalar-webhook-wordpress-mu-plugin/INSTALACAO-MU-PLUGIN.md
    </automated>
  </verify>
  <done>
    - Backup `wp-config.php.bak.{timestamp}` existe no servidor
    - Diretorio `wp-content/mu-plugins/` existe
    - Arquivo `wp-content/mu-plugins/yziws-webhook-imoveis.php` instalado com permissoes 644
    - `php -l` no mu-plugin retorna "No syntax errors detected"
    - `php -l` no `wp-config.php` retorna "No syntax errors detected"
    - `grep` em `wp-config.php` retorna 2 linhas (URL + SECRET)
    - Site WordPress continua acessivel no navegador (front-end nao quebrou)
    - `wp-admin > Plugins > Must-Use` mostra "YZI Webhook Sync — Imoveis"
    - Documento local `INSTALACAO-MU-PLUGIN.md` criado com evidencias (sem expor secret)
    - Nenhum imovel foi criado/editado para teste — proximo passo separado
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Verificacao final humana</name>
  <what-built>
    Mu-plugin `yziws-webhook-imoveis.php` instalado em `wp-content/mu-plugins/`,
    constantes `YZIWS_WEBHOOK_URL` e `YZIWS_WEBHOOK_SECRET` definidas em `wp-config.php`,
    backup `wp-config.php.bak.{timestamp}` salvo, sem teste de imovel disparado.
  </what-built>
  <how-to-verify>
    1. Confirmar visualmente no navegador que o site WordPress da Jurema Brokers
       carrega normalmente (frontend e wp-admin).
    2. Acessar `wp-admin` > **Plugins** > aba **Must-Use** e confirmar que
       `YZI Webhook Sync — Imoveis` aparece listado (sempre ativo, sem botao Activate/Deactivate).
    3. Confirmar via SSH que o backup existe:
       ```
       ls -la <caminho_do_wp_config>.bak.*
       ```
    4. Confirmar via SSH que as constantes estao no `wp-config.php`:
       ```
       grep -E "YZIWS_WEBHOOK_(URL|SECRET)" <caminho_do_wp_config>
       ```
       (deve retornar 2 linhas — NAO compartilhar o valor do secret no chat)
    5. Confirmar via SSH que `php -l` esta limpo em ambos arquivos.
    6. Confirmar que NAO houve teste de imovel — log do endpoint na Vercel deve estar
       silencioso para este servidor.
    7. Como reverter (em caso de problema):
       ```
       cp <caminho_do_wp_config>.bak.<timestamp> <caminho_do_wp_config>
       rm <caminho_do_wp_content>/mu-plugins/yziws-webhook-imoveis.php
       ```

    Proximo passo (NAO executar agora):
    - Configurar `WEBHOOK_IMOVEIS_SECRET` na Vercel (acao do usuario fora deste plano)
    - Editar 1 imovel real no wp-admin para validar o fluxo end-to-end
    - Conferir log do endpoint `POST /api/webhook/imoveis` na Vercel
  </how-to-verify>
  <resume-signal>
    Responda "approved" para finalizar (mensagem final: "Webhook instalado no WordPress.
    Ainda nao salvei imovel."), ou descreva problemas encontrados.
  </resume-signal>
</task>

</tasks>

<verification>
Verificacao do plano completo:
- [ ] Backup `wp-config.php.bak.{timestamp}` existe no servidor
- [ ] Diretorio `wp-content/mu-plugins/` existe e tem permissoes corretas
- [ ] `wp-content/mu-plugins/yziws-webhook-imoveis.php` instalado (644, owner correto)
- [ ] `php -l` no mu-plugin: sem erros
- [ ] `php -l` no `wp-config.php`: sem erros
- [ ] Constantes `YZIWS_WEBHOOK_URL` e `YZIWS_WEBHOOK_SECRET` presentes em `wp-config.php`
- [ ] Site WordPress carrega normalmente (frontend + wp-admin)
- [ ] `wp-admin > Plugins > Must-Use` mostra o snippet listado
- [ ] Documento local `INSTALACAO-MU-PLUGIN.md` criado com evidencias
- [ ] Secret NUNCA foi commitado, logado em PR, ou embutido no PHP
- [ ] Nenhum imovel foi disparado/testado nesta etapa
</verification>

<success_criteria>
- Mu-plugin instalado e carregando sem erros no WordPress da Jurema Brokers
- Constantes definidas em `wp-config.php` com sintaxe valida
- Backup do `wp-config.php` recuperavel a qualquer momento
- Site WordPress funcionando normalmente (sem regressao de frontend ou admin)
- Caminho de rollback documentado e testavel
- Mensagem final entregue: "Webhook instalado no WordPress. Ainda nao salvei imovel."
- Proximo passo claro: configurar Vercel secret + testar com 1 imovel real
</success_criteria>

<output>
Apos a Task 3 ser aprovada, criar `.planning/quick/260502-dnq-instalar-webhook-wordpress-mu-plugin/260502-dnq-SUMMARY.md` documentando:

- Comando SSH usado (host mascarado)
- Caminho do `wp-config.php` no servidor
- Timestamp do backup criado
- Resultado dos `php -l`
- Confirmacao de que as constantes foram adicionadas (sem o valor do secret)
- Confirmacao de que `wp-admin > Plugins > Must-Use` lista o snippet
- Como reverter
- Proximo passo: usuario configurar Vercel + 1 imovel de teste

Mensagem de finalizacao do agente:
"Webhook instalado no WordPress. Ainda nao salvei imovel."
</output>
