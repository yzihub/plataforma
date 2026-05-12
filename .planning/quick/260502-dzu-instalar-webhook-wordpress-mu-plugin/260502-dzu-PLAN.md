---
phase: quick-260502-dzu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - "remote:/home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php"
  - "remote:/home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-content/mu-plugins/yziws-webhook-imoveis.php"
autonomous: true
requirements:
  - "WP-WEBHOOK-INSTALL-01: instalar yziws-webhook-imoveis.php como mu-plugin no servidor WordPress da Jurema"
  - "WP-WEBHOOK-INSTALL-02: configurar constantes YZIWS_WEBHOOK_URL e YZIWS_WEBHOOK_SECRET no wp-config.php"
  - "WP-WEBHOOK-INSTALL-03: validar sintaxe PHP do snippet e do wp-config.php apos alteracoes"
user_setup:
  - service: hostinger-ssh
    why: "Instalacao do mu-plugin requer acesso SSH ao servidor WordPress da Jurema"
    env_vars:
      - name: YZIWS_WEBHOOK_SECRET
        source: "Fornecido pelo executor durante a execucao via prompt — NUNCA hardcoded no plano"

must_haves:
  truths:
    - "Backup .bak do wp-config.php existe no servidor com timestamp"
    - "Diretorio wp-content/mu-plugins/ existe com permissao 755"
    - "Arquivo wp-content/mu-plugins/yziws-webhook-imoveis.php existe com permissao 644"
    - "wp-config.php contem define('YZIWS_WEBHOOK_URL', '...') e define('YZIWS_WEBHOOK_SECRET', '...')"
    - "php -l retorna 'No syntax errors detected' para mu-plugin e wp-config.php"
  artifacts:
    - path: "remote:/home/u378948395/.../wp-config.php.bak.YYYYMMDD-HHMMSS"
      provides: "Rollback do wp-config.php"
    - path: "remote:/home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-content/mu-plugins/yziws-webhook-imoveis.php"
      provides: "Mu-plugin auto-carregavel pelo WordPress"
    - path: "remote:/home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php"
      provides: "Constantes YZIWS_WEBHOOK_URL e YZIWS_WEBHOOK_SECRET"
      contains: "YZIWS_WEBHOOK_URL"
  key_links:
    - from: "wp-config.php (constantes)"
      to: "yziws-webhook-imoveis.php (yziws_can_send)"
      via: "defined()/constant lookup em runtime"
      pattern: "defined\\(\\s*'YZIWS_WEBHOOK_(URL|SECRET)'"
    - from: "wp-content/mu-plugins/"
      to: "WordPress core (auto-load)"
      via: "convencao mu-plugins (must-use plugins) — sem ativacao manual"
      pattern: "wp-content/mu-plugins/.*\\.php"
---

<objective>
Instalar o snippet yziws-webhook-imoveis.php como mu-plugin no servidor WordPress
da Jurema Brokers via SSH, configurar as constantes YZIWS_WEBHOOK_URL e
YZIWS_WEBHOOK_SECRET no wp-config.php e validar a sintaxe PHP de ambos arquivos.

Purpose: Habilitar a sincronizacao automatica WordPress -> YZI Hub. Sem o mu-plugin
instalado e configurado, mudancas em imoveis no WordPress NAO disparam webhook
para /api/webhook/imoveis e o catalogo da plataforma fica desatualizado.

Output:
- Mu-plugin instalado em wp-content/mu-plugins/yziws-webhook-imoveis.php
- Constantes YZIWS_WEBHOOK_URL e YZIWS_WEBHOOK_SECRET adicionadas ao wp-config.php
- Backup .bak do wp-config.php para rollback
- Validacao php -l limpa em ambos arquivos
- Site WordPress continua carregando normalmente (HTTP 200)

Escopo NAO incluido (deliberadamente):
- NAO testar disparo real de webhook (criar/editar imovel)
- NAO configurar variaveis de ambiente da Vercel
- NAO testar end-to-end JetEngine -> Supabase
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php
@.planning/quick/260502-dnq-instalar-webhook-wordpress-mu-plugin/INSTALACAO-MU-PLUGIN.md

<ssh_context>
SSH connection:  ssh -p 65002 u378948395@45.152.46.166
WordPress root:  /home/u378948395/domains/juremabksimoveis.com.br/public_html
Snippet local:   .planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php
Endpoint:        https://plataforma.yzihub.com/api/webhook/imoveis

WEBHOOK_URL:     https://plataforma.yzihub.com/api/webhook/imoveis
WEBHOOK_SECRET:  %%YZIWS_WEBHOOK_SECRET%%   (placeholder — fornecido via prompt)
</ssh_context>

<security>
- NUNCA imprimir o valor real de YZIWS_WEBHOOK_SECRET em logs, stdout ou commits
- NUNCA commitar wp-config.php (servidor remoto, fora do repositorio)
- Sempre usar heredoc com aspas simples ('EOF') ou escape para evitar expansao do shell
- Sempre criar backup .bak antes de editar wp-config.php
</security>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backup wp-config.php e preparar diretorio mu-plugins via SSH</name>
  <files>
    remote:/home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php.bak.YYYYMMDD-HHMMSS
    remote:/home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-content/mu-plugins/
  </files>
  <action>
    Conectar via SSH e executar duas operacoes preparatorias antes de qualquer alteracao destrutiva:

    1. Criar backup timestamped do wp-config.php (rollback obrigatorio):

       ssh -p 65002 u378948395@45.152.46.166 \
         "cd /home/u378948395/domains/juremabksimoveis.com.br/public_html && \
          cp wp-config.php wp-config.php.bak.\$(date +%Y%m%d-%H%M%S) && \
          ls -la wp-config.php.bak.* | tail -1"

       Esperado: linha listando o arquivo .bak recem-criado com tamanho > 0 bytes.

    2. Criar diretorio wp-content/mu-plugins/ se nao existir (idempotente):

       ssh -p 65002 u378948395@45.152.46.166 \
         "cd /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-content && \
          mkdir -p mu-plugins && \
          chmod 755 mu-plugins && \
          ls -ld mu-plugins"

       Esperado: linha "drwxr-xr-x ... mu-plugins".

    Razoes:
    - Backup ANTES de tudo: rollback rapido se editar wp-config errado.
    - mkdir -p e idempotente: nao falha se ja existir (caso o diretorio tenha sido criado em tentativas anteriores).
    - chmod 755: permissao padrao para diretorios web (rwxr-xr-x).

    NAO continuar para Task 2 se algum dos comandos falhar (exit code != 0 ou backup com 0 bytes).
  </action>
  <verify>
    <automated>
ssh -p 65002 u378948395@45.152.46.166 \
  "cd /home/u378948395/domains/juremabksimoveis.com.br/public_html && \
   ls -la wp-config.php.bak.* 2>/dev/null | tail -1 && \
   ls -ld wp-content/mu-plugins"
    </automated>
    Deve retornar: (1) uma linha com wp-config.php.bak.YYYYMMDD-HHMMSS com tamanho > 0,
    (2) uma linha com diretorio mu-plugins permissao drwxr-xr-x.
  </verify>
  <done>
    - Backup wp-config.php.bak.YYYYMMDD-HHMMSS existe com tamanho > 0 bytes
    - Diretorio wp-content/mu-plugins/ existe com permissao 755
    - Nenhum comando retornou exit code != 0
  </done>
</task>

<task type="auto">
  <name>Task 2: Upload do snippet yziws-webhook-imoveis.php para mu-plugins via scp</name>
  <files>
    remote:/home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-content/mu-plugins/yziws-webhook-imoveis.php
  </files>
  <action>
    Copiar o snippet local para o servidor remoto via scp e ajustar permissoes.
    O scp e a opcao recomendada (mais segura que heredoc inline para arquivos > 100 linhas e
    preserva exatamente o conteudo do arquivo local sem riscos de escape de aspas/dolares).

    1. Upload via scp (porta 65002):

       scp -P 65002 \
         ".planning/quick/260501-ufh-criar-snippet-php-para-wordpress-que-dis/yziws-webhook-imoveis.php" \
         u378948395@45.152.46.166:/home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-content/mu-plugins/yziws-webhook-imoveis.php

       Esperado: stderr mostra "yziws-webhook-imoveis.php   100%   ... bytes" e exit code 0.

    2. Ajustar permissao para 644 (rw-r--r--, padrao para arquivos PHP):

       ssh -p 65002 u378948395@45.152.46.166 \
         "chmod 644 /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-content/mu-plugins/yziws-webhook-imoveis.php && \
          ls -la /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-content/mu-plugins/yziws-webhook-imoveis.php"

       Esperado: linha "-rw-r--r-- ... yziws-webhook-imoveis.php" com tamanho > 10000 bytes.

    3. Validar sintaxe PHP do arquivo recem-instalado:

       ssh -p 65002 u378948395@45.152.46.166 \
         "php -l /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-content/mu-plugins/yziws-webhook-imoveis.php"

       Esperado: "No syntax errors detected in /home/.../yziws-webhook-imoveis.php".
       Se houver erro de sintaxe (improvavel — o snippet ja foi validado localmente em 260501-ufh/vnn),
       NAO prosseguir para Task 3. Investigar e re-uploadar.

    Razoes:
    - scp evita problemas de heredoc com aspas, $ e <?php tags
    - Permissao 644 e o padrao seguro para arquivos PHP no Hostinger
    - php -l roda no servidor real e confirma compatibilidade com a versao PHP do host

    Atencao: NAO substituir um arquivo existente sem backup. Se ja houver um yziws-webhook-imoveis.php
    no diretorio (improvavel), fazer:
       ssh ... "mv .../yziws-webhook-imoveis.php .../yziws-webhook-imoveis.php.bak.\$(date +%Y%m%d-%H%M%S)"
    antes do scp.
  </action>
  <verify>
    <automated>
ssh -p 65002 u378948395@45.152.46.166 \
  "php -l /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-content/mu-plugins/yziws-webhook-imoveis.php && \
   ls -la /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-content/mu-plugins/yziws-webhook-imoveis.php"
    </automated>
    Deve retornar: (1) "No syntax errors detected in ..." (2) linha com permissao -rw-r--r-- e tamanho > 10000 bytes.
  </verify>
  <done>
    - Arquivo yziws-webhook-imoveis.php existe em wp-content/mu-plugins/
    - Permissao do arquivo e 644 (-rw-r--r--)
    - php -l retorna "No syntax errors detected"
    - Tamanho do arquivo no remoto bate (aproximadamente) com o tamanho local
  </done>
</task>

<task type="auto">
  <name>Task 3: Adicionar constantes YZIWS_WEBHOOK_URL e YZIWS_WEBHOOK_SECRET no wp-config.php</name>
  <files>
    remote:/home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php
  </files>
  <action>
    Adicionar as duas constantes obrigatorias do snippet ao wp-config.php do servidor.
    A insercao deve ocorrer ANTES da linha "/* That's all, stop editing! Happy publishing. */"
    para garantir que sejam carregadas antes do WordPress core inicializar.

    O valor real de YZIWS_WEBHOOK_SECRET sera fornecido pelo orquestrador via prompt durante
    a execucao deste task — NAO esta presente neste plano. Substituir o placeholder
    %%YZIWS_WEBHOOK_SECRET%% pelo valor real apenas no comando SSH em runtime.

    1. Verificar se as constantes ja existem (idempotencia):

       ssh -p 65002 u378948395@45.152.46.166 \
         "grep -E \"YZIWS_WEBHOOK_(URL|SECRET)\" /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php || echo 'NOT_FOUND'"

       Se retornar "NOT_FOUND", prosseguir.
       Se ja houver as constantes definidas, PARAR e reportar — nao sobrescrever sem revisao.

    2. Inserir as duas constantes antes da linha "/* That's all, stop editing!" via sed:

       Usar sed -i com pattern que case a linha exata do WordPress core. Importante:
       - A insercao usa "i" (insert before) com newlines explicitos
       - O valor do SECRET e injetado via variavel shell para evitar exposicao em logs

       ssh -p 65002 u378948395@45.152.46.166 \
         "WEBHOOK_SECRET='%%YZIWS_WEBHOOK_SECRET%%' && \
          cd /home/u378948395/domains/juremabksimoveis.com.br/public_html && \
          sed -i \"/\\/\\* That's all, stop editing/i \\\\\\
// YZI Hub webhook constants (added by quick-260502-dzu)\\\\\\
define('YZIWS_WEBHOOK_URL', 'https://plataforma.yzihub.com/api/webhook/imoveis');\\\\\\
define('YZIWS_WEBHOOK_SECRET', '\${WEBHOOK_SECRET}');\\\\\\
\" wp-config.php"

       Razao do sed em vez de heredoc completo: preserva todas as outras configuracoes
       do wp-config.php (DB credentials, salts, etc.) sem riscos de perder ou reescrever.

       Atencao ao escape: aspas e backslashes precisam ser duplamente escapados quando
       o comando passa por SSH + bash + sed. Se o sed in-place falhar com erro de syntax,
       a alternativa segura e baixar wp-config.php local com scp, editar, e re-uploadar.

    3. Verificar que as constantes foram inseridas no lugar correto:

       ssh -p 65002 u378948395@45.152.46.166 \
         "grep -B1 -A1 \"YZIWS_WEBHOOK\" /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php"

       Esperado: 3 ocorrencias (URL, SECRET, mas SECRET com valor MASCARADO no relato — nunca imprimir
       o secret real em stdout/log de checagem). Se reportar exit code != 0, investigar.

    NUNCA imprimir o valor real do WEBHOOK_SECRET em qualquer comando subsequente
    (use apenas grep da chave, nao do valor).
  </action>
  <verify>
    <automated>
ssh -p 65002 u378948395@45.152.46.166 \
  "grep -c \"YZIWS_WEBHOOK_URL\" /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php && \
   grep -c \"YZIWS_WEBHOOK_SECRET\" /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php"
    </automated>
    Deve retornar "1\n1" (uma ocorrencia de cada constante). NAO imprimir o valor do secret —
    o verify checa apenas a presenca das chaves.
  </verify>
  <done>
    - wp-config.php contem exatamente uma linha com define('YZIWS_WEBHOOK_URL', '...')
    - wp-config.php contem exatamente uma linha com define('YZIWS_WEBHOOK_SECRET', '...')
    - Ambas as constantes foram inseridas ANTES de "/* That's all, stop editing!"
    - O valor do SECRET nao foi exposto em nenhum log ou output
  </done>
</task>

<task type="auto">
  <name>Task 4: Validar sintaxe PHP do wp-config.php apos as alteracoes</name>
  <files>
    remote:/home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php
  </files>
  <action>
    Apos a edicao do wp-config.php, e CRITICO validar a sintaxe PHP. Um wp-config.php
    quebrado deixa o site fora do ar imediatamente (white screen of death). Se a validacao
    falhar, restaurar do backup criado na Task 1.

    1. Rodar php -l no wp-config.php editado:

       ssh -p 65002 u378948395@45.152.46.166 \
         "php -l /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php"

       Esperado: "No syntax errors detected in /home/.../wp-config.php"

    2. Se php -l retornar erro de sintaxe, executar rollback IMEDIATAMENTE:

       # Listar backups disponiveis
       ssh -p 65002 u378948395@45.152.46.166 \
         "ls -t /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php.bak.* | head -1"

       # Restaurar do backup mais recente (substituir BACKUP_FILE pelo nome real)
       ssh -p 65002 u378948395@45.152.46.166 \
         "cp /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php.bak.YYYYMMDD-HHMMSS \
             /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php && \
          php -l /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php"

       Apos rollback, reportar erro detalhado e PARAR a execucao do plano.

    3. Verificacao adicional (opcional mas recomendada): confirmar que o site continua respondendo:

       curl -sI -o /dev/null -w "%{http_code}\n" https://juremabksimoveis.com.br/

       Esperado: 200 ou 301/302 (redirect HTTPS valido). Codigo 500/503 indica erro fatal —
       executar rollback.

    Razoes:
    - php -l e a unica defesa antes do site ir ao ar quebrado
    - Backup foi criado na Task 1 justamente para este cenario
    - curl HEAD nao gera carga e confirma que o WordPress carrega
  </action>
  <verify>
    <automated>
ssh -p 65002 u378948395@45.152.46.166 \
  "php -l /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php" && \
curl -sI -o /dev/null -w "site_status=%{http_code}\n" https://juremabksimoveis.com.br/
    </automated>
    Deve retornar: (1) "No syntax errors detected in /home/.../wp-config.php"
    (2) "site_status=200" (ou 301/302 se houver redirect HTTPS).
  </verify>
  <done>
    - php -l retorna "No syntax errors detected" para wp-config.php
    - curl ao site da Jurema retorna HTTP 200/301/302 (site no ar)
    - Backup .bak da Task 1 ainda existe (nao deletar — usar para rollback futuro se necessario)
  </done>
</task>

</tasks>

<verification>
Verificacao geral apos todos os tasks (pode ser executada como smoke test final):

1. Mu-plugin instalado e auto-carregado:
   ssh -p 65002 u378948395@45.152.46.166 \
     "ls -la /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-content/mu-plugins/yziws-webhook-imoveis.php"
   Esperado: -rw-r--r-- ... yziws-webhook-imoveis.php

2. Constantes presentes no wp-config.php:
   ssh -p 65002 u378948395@45.152.46.166 \
     "grep -c YZIWS_WEBHOOK /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php"
   Esperado: 2 (URL + SECRET)

3. Sintaxe PHP limpa nos dois arquivos:
   ssh -p 65002 u378948395@45.152.46.166 \
     "php -l .../wp-content/mu-plugins/yziws-webhook-imoveis.php && \
      php -l .../wp-config.php"
   Esperado: "No syntax errors detected" em ambos

4. Site da Jurema continua acessivel:
   curl -sI https://juremabksimoveis.com.br/ | head -1
   Esperado: HTTP/2 200 (ou 301/302)

5. Backup do wp-config preservado:
   ssh -p 65002 u378948395@45.152.46.166 \
     "ls -la /home/u378948395/domains/juremabksimoveis.com.br/public_html/wp-config.php.bak.*"
   Esperado: pelo menos 1 arquivo .bak listado
</verification>

<success_criteria>
- [ ] Backup wp-config.php.bak.YYYYMMDD-HHMMSS criado e preservado
- [ ] Diretorio wp-content/mu-plugins/ existe com permissao 755
- [ ] Arquivo yziws-webhook-imoveis.php instalado em mu-plugins/ com permissao 644
- [ ] php -l limpo no mu-plugin (sem erros de sintaxe)
- [ ] Constantes YZIWS_WEBHOOK_URL e YZIWS_WEBHOOK_SECRET adicionadas ao wp-config.php
- [ ] php -l limpo no wp-config.php (sem erros de sintaxe)
- [ ] Site juremabksimoveis.com.br responde HTTP 200/301/302
- [ ] Valor real do YZIWS_WEBHOOK_SECRET nunca foi impresso em log/stdout/commit
- [ ] Nenhum arquivo do servidor remoto foi commitado neste repositorio

Fora de escopo (NAO testar neste plano):
- Disparo real de webhook (criar/editar imovel no WordPress)
- Verificacao da chegada de payload no endpoint /api/webhook/imoveis
- Configuracao de variaveis de ambiente da Vercel
- Sincronizacao end-to-end JetEngine -> Supabase
</success_criteria>

<output>
After completion, create `.planning/quick/260502-dzu-instalar-webhook-wordpress-mu-plugin/260502-dzu-SUMMARY.md`

Resumo deve incluir:
- Timestamp do backup criado (YYYYMMDD-HHMMSS)
- Caminho absoluto do mu-plugin instalado
- Confirmacao das duas constantes inseridas (sem expor valor do SECRET)
- Output do php -l de ambos arquivos
- Codigo HTTP retornado pelo curl ao site da Jurema
- Lista de comandos SSH executados (com SECRET MASCARADO se aparecer)
- Proximos passos (sugestao: testar disparo real criando/editando 1 imovel no WordPress)
</output>
