# Infra Checklist - Ju Cognitive Runtime

## Host

- [ ] Node 22+
- [ ] Docker ativo
- [ ] Docker Swarm ativo
- [ ] Traefik ativo
- [ ] Firewall ativo
- [ ] SSH restrito

## Rede

- [ ] `runtime.yzihub.com` resolve corretamente
- [ ] Cloudflare proxy ON
- [ ] SSL Full Strict
- [ ] porta 443 acessivel
- [ ] porta interna do runtime isolada

## Storage

- [ ] logs persistidos
- [ ] backup de banco confirmados
- [ ] nenhum estado critico apenas em memoria

## Runtime dependencies

- [ ] Redis acessivel
- [ ] Supabase acessivel
- [ ] OpenAI acessivel
- [ ] Evolution acessivel
- [ ] n8n tools acessiveis

## Observabilidade

- [ ] request_id em todos os logs
- [ ] metrics expostas
- [ ] health endpoint funcionando
- [ ] alertas de timeout e fallback

## Operacao

- [ ] restart policy definida
- [ ] graceful shutdown testado
- [ ] rollback command documentado
- [ ] emergency force-n8n testado
