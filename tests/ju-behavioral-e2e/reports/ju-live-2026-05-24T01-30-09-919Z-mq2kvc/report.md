# Ju Behavioral E2E Audit Report

- Run ID: ju-live-2026-05-24T01-30-09-919Z-mq2kvc
- Test run ID: ju-live-2026-05-24T01-30-09-919Z-mq2kvc
- Tenant ID: 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361
- Endpoint: https://api.yzihub.com/webhook/ju
- Mode: live API plus real database validation
- Started: 2026-05-24T01:30:09.922Z
- Finished: 2026-05-24T01:34:52.821Z
- Scenarios: 15
- Turns: 39
- Passing scenarios: 2/15
- Average behavioral score: 93

## Scenario Results

### Lead Site

- Score: 88
- Pass: no
- Persona: Comprador direto do site, ja navegou por imoveis e quer orientacao sem recomecar qualificacao.
- Emotional context: Curioso, com interesse real, mas ainda comparando regioes.
- Source channel: site
- Critical violations: 2
- Warning violations: 2

Turns:
- Turn 1: HTTP 200, score 100, latency 3731ms, messages 1, audits 1
- Turn 2: HTTP 200, score 94, latency 4626ms, messages 3, audits 1
- Turn 3: HTTP 200, score 70, latency 4271ms, messages 4, audits 2

### Lead Instagram

- Score: 93
- Pass: no
- Persona: Lead vindo de conteudo visual, responde por impulso a um post ou story.
- Emotional context: Quer algo bonito e pratico, mas ainda fala de forma leve.
- Source channel: instagram
- Critical violations: 1
- Warning violations: 2

Turns:
- Turn 1: HTTP 200, score 94, latency 3516ms, messages 6, audits 2
- Turn 2: HTTP 200, score 100, latency 3914ms, messages 8, audits 4
- Turn 3: HTTP 200, score 86, latency 4401ms, messages 10, audits 4

### Lead Referral / Indicacao

- Score: 90
- Pass: no
- Persona: Lead indicado por conhecido, chega com confianca inicial e espera atendimento mais pessoal.
- Emotional context: Menos desconfiado, mas quer sentir cuidado e criterio.
- Source channel: referral
- Critical violations: 2
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 100, latency 3668ms, messages 12, audits 5
- Turn 2: HTTP 200, score 100, latency 4275ms, messages 14, audits 6
- Turn 3: HTTP 200, score 70, latency 4065ms, messages 16, audits 8

### Lead Paid Ad

- Score: 88
- Pass: no
- Persona: Lead de anuncio pago, clicou por oferta e pode ter expectativa de produto especifico.
- Emotional context: Interesse rapido, sensivel a preco e aderencia do anuncio.
- Source channel: paid_ad
- Critical violations: 2
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 88, latency 3757ms, messages 18, audits 8
- Turn 2: HTTP 200, score 88, latency 4105ms, messages 20, audits 10

### Investor Lead

- Score: 95
- Pass: no
- Persona: Investidor racional, compara retorno, liquidez e valorizacao.
- Emotional context: Analitico, quer reduzir risco e entender tese.
- Source channel: meta_ads
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 100, latency 4043ms, messages 22, audits 10
- Turn 2: HTTP 200, score 100, latency 4540ms, messages 23, audits 11
- Turn 3: HTTP 200, score 86, latency 4232ms, messages 25, audits 12

### Couple Decision Lead

- Score: 96
- Pass: no
- Persona: Casal em decisao conjunta, busca reduzir conflito entre preferencias.
- Emotional context: Ha desejo real, mas precisam organizar criterios.
- Source channel: site
- Critical violations: 1
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 100, latency 3387ms, messages 27, audits 13
- Turn 2: HTTP 200, score 100, latency 4156ms, messages 30, audits 15
- Turn 3: HTTP 200, score 88, latency 3624ms, messages 31, audits 15

### Beach Lifestyle Lead

- Score: 93
- Pass: no
- Persona: Comprador lifestyle, compra por rotina, praia e bem-estar.
- Emotional context: Busca sensacao de vida melhor, nao so metragem.
- Source channel: instagram
- Critical violations: 2
- Warning violations: 3

Turns:
- Turn 1: HTTP 200, score 100, latency 3432ms, messages 2, audits 18
- Turn 2: HTTP 200, score 100, latency 3768ms, messages 2, audits 18
- Turn 3: HTTP 200, score 78, latency 4380ms, messages 4, audits 19

### Luxury Lead

- Score: 94
- Pass: no
- Persona: Alto padrao, valoriza exclusividade, acabamento, vista e privacidade.
- Emotional context: Quer sentir criterio e discricao, nao pressao comercial.
- Source channel: paid_social
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 94, latency 3689ms, messages 6, audits 20
- Turn 2: HTTP 200, score 100, latency 4067ms, messages 8, audits 21
- Turn 3: HTTP 200, score 88, latency 3718ms, messages 10, audits 21

### Cold Lead

- Score: 100
- Pass: yes
- Persona: Lead inicial, sem clareza de bairro, valor ou prazo.
- Emotional context: Curioso e inseguro, pode sumir se pressionado.
- Source channel: google
- Critical violations: 0
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 100, latency 3353ms, messages 11, audits 22
- Turn 2: HTTP 200, score 100, latency 3699ms, messages 14, audits 23

### Re-engagement Lead

- Score: 79
- Pass: no
- Persona: Lead antigo retorna apos silencio e espera continuidade.
- Emotional context: Nao quer repetir tudo; testa se a Ju lembra do contexto.
- Source channel: database_reactivation
- Critical violations: 4
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 66, latency 3177ms, messages 16, audits 24
- Turn 2: HTTP 200, score 92, latency 3913ms, messages 18, audits 26

### Financing Concern Lead

- Score: 100
- Pass: yes
- Persona: Comprador com receio de financiamento e parcelas.
- Emotional context: Quer comprar, mas sente risco financeiro.
- Source channel: site
- Critical violations: 0
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 100, latency 3957ms, messages 2, audits 28
- Turn 2: HTTP 200, score 100, latency 3557ms, messages 3, audits 28

### FGTS Lead

- Score: 91
- Pass: no
- Persona: Comprador quer usar FGTS e precisa entender viabilidade operacional.
- Emotional context: Pratico, busca clareza e reducao de burocracia.
- Source channel: google
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 100, latency 3464ms, messages 4, audits 28
- Turn 2: HTTP 200, score 82, latency 3699ms, messages 6, audits 29

### Family Lead

- Score: 99
- Pass: no
- Persona: Familia crescendo, prioriza escola, seguranca, rotina e conforto.
- Emotional context: Busca estabilidade e qualidade de vida.
- Source channel: referral
- Critical violations: 1
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 100, latency 3270ms, messages 8, audits 30
- Turn 2: HTTP 200, score 100, latency 3716ms, messages 10, audits 31
- Turn 3: HTTP 200, score 96, latency 3872ms, messages 13, audits 33

### Short Stay Investor

- Score: 96
- Pass: no
- Persona: Investidor de locacao curta temporada, foco em demanda e operacao.
- Emotional context: Quer tese objetiva e cuidado com risco operacional.
- Source channel: paid_ad
- Critical violations: 1
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 100, latency 3718ms, messages 14, audits 33
- Turn 2: HTTP 200, score 100, latency 3833ms, messages 16, audits 34
- Turn 3: HTTP 200, score 88, latency 4125ms, messages 18, audits 36

### High Intent Visit Lead

- Score: 88
- Pass: no
- Persona: Lead pronto para visitar, com criterio claro e timing curto.
- Emotional context: Quer agilidade, mas sem atrito ou perguntas desnecessarias.
- Source channel: site
- Critical violations: 1
- Warning violations: 2

Turns:
- Turn 1: HTTP 200, score 82, latency 3486ms, messages 20, audits 36
- Turn 2: HTTP 200, score 94, latency 4099ms, messages 20, audits 37

## Critical Violations

- Lead Site turn 3: missing_direct_property_presentation_signal
- Lead Site turn 3: asked_permission_instead_of_presenting
- Lead Instagram turn 3: missing_direct_property_presentation_signal
- Lead Referral / Indicacao turn 3: missing_direct_property_presentation_signal
- Lead Referral / Indicacao turn 3: asked_permission_instead_of_presenting
- Lead Paid Ad turn 1: missing_direct_property_presentation_signal
- Lead Paid Ad turn 2: missing_direct_property_presentation_signal
- Investor Lead turn 3: missing_direct_property_presentation_signal
- Couple Decision Lead turn 3: missing_direct_property_presentation_signal
- Beach Lifestyle Lead turn 3: missing_direct_property_presentation_signal
- Beach Lifestyle Lead turn 3: asked_permission_instead_of_presenting
- Luxury Lead turn 3: missing_direct_property_presentation_signal
- Re-engagement Lead turn 1: permission_posso_te_mostrar
- Re-engagement Lead turn 1: missing_direct_property_presentation_signal
- Re-engagement Lead turn 1: asked_permission_instead_of_presenting
- Re-engagement Lead turn 2: missing_direct_property_presentation_signal
- FGTS Lead turn 2: missing_direct_property_presentation_signal
- Family Lead turn 3: missing_direct_property_presentation_signal
- Short Stay Investor turn 3: missing_direct_property_presentation_signal
- High Intent Visit Lead turn 1: missing_direct_property_presentation_signal
