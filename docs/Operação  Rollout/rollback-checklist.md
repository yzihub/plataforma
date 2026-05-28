# Rollback Checklist - Ju Cognitive Runtime

## Immediate rollback

- [ ] ativar `JUREMA_CUTOVER_FORCE_N8N=true`
- [ ] ativar `JUREMA_CUTOVER_EMERGENCY_FALLBACK=true` se necessario
- [ ] congelar rollout
- [ ] mover conversa afetada para n8n

## Verify after rollback

- [ ] runtime parou de responder ao turno novo
- [ ] Evolution voltou ao fluxo anterior
- [ ] nenhum outbound duplica mensagem
- [ ] logs indicam motivo do fallback

## Recovery

- [ ] revisar `ju_runtime_edge_case_queue`
- [ ] revisar divergencias criticas
- [ ] revisar guardian rejections
- [ ] revisar latencia e timeouts
- [ ] revisar custo e contexto

## Re-enable criteria

- [ ] issue identificado
- [ ] issue corrigido
- [ ] health ok
- [ ] metrics ok
- [ ] parity recuperada
- [ ] pilot gate reaberto manualmente
