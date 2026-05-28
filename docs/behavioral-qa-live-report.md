# Ju Behavioral QA Live Report

Data da verificação: 2026-05-25

## Resumo Executivo

- Endpoint oficial alvo: `https://runtime.yzihub.com/cognitive/turn`
- Healthcheck alvo: `https://runtime.yzihub.com/health`
- Metrics alvo: `https://runtime.yzihub.com/metrics`
- Modo atual esperado: `behavioral_qa`
- Phone QA configurado: `5583999990002`

## O que foi validado

- O runner de QA real foi ajustado para usar o endpoint oficial do runtime.
- O runner passou a enviar o header `x-webhook-secret` a partir do ambiente.
- A sintaxe do script de QA foi validada com `node --check`.
- O typecheck do projeto passou com `npm run typecheck`.

## O que foi tentado

- Requisição direta para `https://runtime.yzihub.com/health`
- Requisição direta para `https://runtime.yzihub.com/metrics`
- Inicialização local do runtime via `npm run start:runtime`

## Bloqueios encontrados

### 1. Endpoint público inacessível daqui

As requisições para `runtime.yzihub.com` falharam com erro de conexão na porta 443.

### 2. Runtime local não sobe com o `.env.local` atual

O processo de bootstrap falha com:

- `DATABASE_URL or SUPABASE_DB_URL` ausente
- `REDIS_URL` ausente

Sem essas variáveis, o runtime não inicia e a QA live não pode ser executada com esse ambiente.

## Impacto

- Não foi possível executar a rodada real de 50-100 conversas QA.
- Não foi possível confirmar `/health` e `/metrics` em produção a partir deste ambiente.
- Não foi possível gerar um live report com conversas reais sem primeiro corrigir o acesso ao runtime e as credenciais de infraestrutura.

## Pronto para seguir quando

- `runtime.yzihub.com` responder em `443`
- `DATABASE_URL` ou `SUPABASE_DB_URL` estiver disponível para o processo
- `REDIS_URL` estiver disponível para o processo
- o runtime subir e responder `GET /health`
- o runner puder apontar para o webhook oficial com `x-webhook-secret`

## Observação operacional

Não alterei doctrines, prompts, governança, heurísticas ou arquitetura cognitiva. O ajuste feito foi apenas na camada de execução do QA para o webhook oficial e no registro do estado atual da validação.
