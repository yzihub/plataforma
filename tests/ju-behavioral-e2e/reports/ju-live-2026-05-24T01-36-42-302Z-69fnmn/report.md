# Ju Behavioral E2E Audit Report

- Run ID: ju-live-2026-05-24T01-36-42-302Z-69fnmn
- Test run ID: ju-live-2026-05-24T01-36-42-302Z-69fnmn
- Tenant ID: 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361
- Endpoint: https://api.yzihub.com/webhook/ju
- Mode: live API plus real database validation
- Started: 2026-05-24T01:36:42.303Z
- Finished: 2026-05-24T01:44:04.549Z
- Scenarios: 15
- Turns: 39
- Passing scenarios: 2/15
- Average behavioral score: 93

## Scenario Results

### Lead Site

- Score: 90
- Pass: no
- Persona: Comprador direto do site, ja navegou por imoveis e quer orientacao sem recomecar qualificacao.
- Emotional context: Curioso, com interesse real, mas ainda comparando regioes.
- Source channel: site
- Critical violations: 1
- Warning violations: 3

Turns:
- Turn 1: HTTP 200, score 94, latency 3416ms, messages 2, audits 1
- Turn 2: HTTP 200, score 94, latency 3521ms, messages 3, audits 1
- Turn 3: HTTP 200, score 82, latency 3278ms, messages 4, audits 2

### Lead Instagram

- Score: 95
- Pass: no
- Persona: Lead vindo de conteudo visual, responde por impulso a um post ou story.
- Emotional context: Quer algo bonito e pratico, mas ainda fala de forma leve.
- Source channel: instagram
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 94, latency 2859ms, messages 6, audits 2
- Turn 2: HTTP 200, score 100, latency 3135ms, messages 8, audits 3
- Turn 3: HTTP 200, score 92, latency 3293ms, messages 10, audits 5

### Lead Referral / Indicacao

- Score: 97
- Pass: no
- Persona: Lead indicado por conhecido, chega com confianca inicial e espera atendimento mais pessoal.
- Emotional context: Menos desconfiado, mas quer sentir cuidado e criterio.
- Source channel: referral
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 100, latency 3148ms, messages 2, audits 7
- Turn 2: HTTP 200, score 100, latency 3203ms, messages 3, audits 7
- Turn 3: HTTP 200, score 90, latency 3532ms, messages 5, audits 8

### Lead Paid Ad

- Score: 89
- Pass: no
- Persona: Lead de anuncio pago, clicou por oferta e pode ter expectativa de produto especifico.
- Emotional context: Interesse rapido, sensivel a preco e aderencia do anuncio.
- Source channel: paid_ad
- Critical violations: 2
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 90, latency 3381ms, messages 6, audits 8
- Turn 2: HTTP 200, score 88, latency 3206ms, messages 9, audits 10

### Investor Lead

- Score: 95
- Pass: no
- Persona: Investidor racional, compara retorno, liquidez e valorizacao.
- Emotional context: Analitico, quer reduzir risco e entender tese.
- Source channel: meta_ads
- Critical violations: 2
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 100, latency 3236ms, messages 10, audits 11
- Turn 2: HTTP 200, score 100, latency 3171ms, messages 12, audits 11
- Turn 3: HTTP 200, score 84, latency 3263ms, messages 15, audits 13

### Couple Decision Lead

- Score: 95
- Pass: no
- Persona: Casal em decisao conjunta, busca reduzir conflito entre preferencias.
- Emotional context: Ha desejo real, mas precisam organizar criterios.
- Source channel: site
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 100, latency 3106ms, messages 16, audits 13
- Turn 2: HTTP 200, score 100, latency 3463ms, messages 19, audits 15
- Turn 3: HTTP 200, score 86, latency 4201ms, messages 21, audits 16

### Beach Lifestyle Lead

- Score: 97
- Pass: no
- Persona: Comprador lifestyle, compra por rotina, praia e bem-estar.
- Emotional context: Busca sensacao de vida melhor, nao so metragem.
- Source channel: instagram
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 100, latency 3423ms, messages 23, audits 17
- Turn 2: HTTP 200, score 100, latency 3160ms, messages 24, audits 18
- Turn 3: HTTP 200, score 90, latency 4159ms, messages 27, audits 19

### Luxury Lead

- Score: 94
- Pass: no
- Persona: Alto padrao, valoriza exclusividade, acabamento, vista e privacidade.
- Emotional context: Quer sentir criterio e discricao, nao pressao comercial.
- Source channel: paid_social
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 100, latency 3374ms, messages 29, audits 20
- Turn 2: HTTP 200, score 94, latency 4551ms, messages 30, audits 21
- Turn 3: HTTP 200, score 88, latency 4145ms, messages 32, audits 22

### Cold Lead

- Score: 100
- Pass: yes
- Persona: Lead inicial, sem clareza de bairro, valor ou prazo.
- Emotional context: Curioso e inseguro, pode sumir se pressionado.
- Source channel: google
- Critical violations: 0
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 100, latency 3398ms, messages 35, audits 23
- Turn 2: HTTP 200, score 100, latency 3730ms, messages 37, audits 24

### Re-engagement Lead

- Score: 72
- Pass: no
- Persona: Lead antigo retorna apos silencio e espera continuidade.
- Emotional context: Nao quer repetir tudo; testa se a Ju lembra do contexto.
- Source channel: database_reactivation
- Critical violations: 5
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 70, latency 3692ms, messages 39, audits 25
- Turn 2: HTTP 200, score 74, latency 4218ms, messages 41, audits 26

### Financing Concern Lead

- Score: 98
- Pass: yes
- Persona: Comprador com receio de financiamento e parcelas.
- Emotional context: Quer comprar, mas sente risco financeiro.
- Source channel: site
- Critical violations: 0
- Warning violations: 2

Turns:
- Turn 1: HTTP 200, score 98, latency 3960ms, messages 2, audits 28
- Turn 2: HTTP 200, score 98, latency 3728ms, messages 2, audits 28

### FGTS Lead

- Score: 93
- Pass: no
- Persona: Comprador quer usar FGTS e precisa entender viabilidade operacional.
- Emotional context: Pratico, busca clareza e reducao de burocracia.
- Source channel: google
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 100, latency 4234ms, messages 5, audits 29
- Turn 2: HTTP 200, score 86, latency 4491ms, messages 7, audits 30

### Family Lead

- Score: 92
- Pass: no
- Persona: Familia crescendo, prioriza escola, seguranca, rotina e conforto.
- Emotional context: Busca estabilidade e qualidade de vida.
- Source channel: referral
- Critical violations: 1
- Warning violations: 2

Turns:
- Turn 1: HTTP 200, score 94, latency 3661ms, messages 9, audits 31
- Turn 2: HTTP 200, score 100, latency 4612ms, messages 11, audits 32
- Turn 3: HTTP 200, score 82, latency 4024ms, messages 13, audits 33

### Short Stay Investor

- Score: 93
- Pass: no
- Persona: Investidor de locacao curta temporada, foco em demanda e operacao.
- Emotional context: Quer tese objetiva e cuidado com risco operacional.
- Source channel: paid_ad
- Critical violations: 1
- Warning violations: 2

Turns:
- Turn 1: HTTP 200, score 100, latency 3265ms, messages 15, audits 34
- Turn 2: HTTP 200, score 98, latency 3306ms, messages 17, audits 35
- Turn 3: HTTP 200, score 82, latency 3460ms, messages 18, audits 36

### High Intent Visit Lead

- Score: 91
- Pass: no
- Persona: Lead pronto para visitar, com criterio claro e timing curto.
- Emotional context: Quer agilidade, mas sem atrito ou perguntas desnecessarias.
- Source channel: site
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 88, latency 3433ms, messages 21, audits 37
- Turn 2: HTTP 200, score 94, latency 4420ms, messages 23, audits 38

## Critical Violations

- Lead Site turn 3: missing_direct_property_presentation_signal
- Lead Instagram turn 3: missing_direct_property_presentation_signal
- Lead Referral / Indicacao turn 3: missing_direct_property_presentation_signal
- Lead Paid Ad turn 1: missing_direct_property_presentation_signal
- Lead Paid Ad turn 2: missing_direct_property_presentation_signal
- Investor Lead turn 3: missing_direct_property_presentation_signal
- Investor Lead turn 3: asked_permission_instead_of_presenting
- Couple Decision Lead turn 3: missing_direct_property_presentation_signal
- Beach Lifestyle Lead turn 3: missing_direct_property_presentation_signal
- Luxury Lead turn 3: missing_direct_property_presentation_signal
- Re-engagement Lead turn 1: permission_posso_te_mostrar
- Re-engagement Lead turn 1: missing_direct_property_presentation_signal
- Re-engagement Lead turn 1: asked_permission_instead_of_presenting
- Re-engagement Lead turn 2: missing_direct_property_presentation_signal
- Re-engagement Lead turn 2: asked_permission_instead_of_presenting
- FGTS Lead turn 2: missing_direct_property_presentation_signal
- Family Lead turn 3: missing_direct_property_presentation_signal
- Short Stay Investor turn 3: missing_direct_property_presentation_signal
- High Intent Visit Lead turn 1: missing_direct_property_presentation_signal
