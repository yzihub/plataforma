# Ju Behavioral E2E Audit Report

- Run ID: ju-live-2026-05-24T02-28-53-647Z-6lby0d
- Test run ID: ju-live-2026-05-24T02-28-53-647Z-6lby0d
- Tenant ID: 82cc7aa9-fc6e-4f37-8d8e-8a71c1691361
- Endpoint: https://api.yzihub.com/webhook/ju
- Mode: live API plus real database validation
- Started: 2026-05-24T02:28:53.649Z
- Finished: 2026-05-24T02:34:02.644Z
- Scenarios: 15
- Turns: 39
- Passing scenarios: 2/15
- Average behavioral score: 94

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
- Turn 1: HTTP 200, score 94, latency 978ms, messages 2, audits 1
- Turn 2: HTTP 200, score 94, latency 856ms, messages 2, audits 1
- Turn 3: HTTP 200, score 82, latency 655ms, messages 4, audits 1

### Lead Instagram

- Score: 93
- Pass: no
- Persona: Lead vindo de conteudo visual, responde por impulso a um post ou story.
- Emotional context: Quer algo bonito e pratico, mas ainda fala de forma leve.
- Source channel: instagram
- Critical violations: 2
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 94, latency 682ms, messages 5, audits 1
- Turn 2: HTTP 200, score 100, latency 1138ms, messages 7, audits 2
- Turn 3: HTTP 200, score 84, latency 1024ms, messages 8, audits 3

### Lead Referral / Indicacao

- Score: 94
- Pass: no
- Persona: Lead indicado por conhecido, chega com confianca inicial e espera atendimento mais pessoal.
- Emotional context: Menos desconfiado, mas quer sentir cuidado e criterio.
- Source channel: referral
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 100, latency 761ms, messages 10, audits 3
- Turn 2: HTTP 200, score 100, latency 765ms, messages 12, audits 5
- Turn 3: HTTP 200, score 82, latency 704ms, messages 15, audits 6

### Lead Paid Ad

- Score: 92
- Pass: no
- Persona: Lead de anuncio pago, clicou por oferta e pode ter expectativa de produto especifico.
- Emotional context: Interesse rapido, sensivel a preco e aderencia do anuncio.
- Source channel: paid_ad
- Critical violations: 2
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 92, latency 850ms, messages 17, audits 7
- Turn 2: HTTP 200, score 92, latency 728ms, messages 18, audits 8

### Investor Lead

- Score: 97
- Pass: no
- Persona: Investidor racional, compara retorno, liquidez e valorizacao.
- Emotional context: Analitico, quer reduzir risco e entender tese.
- Source channel: meta_ads
- Critical violations: 1
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 100, latency 777ms, messages 20, audits 8
- Turn 2: HTTP 200, score 100, latency 729ms, messages 22, audits 9
- Turn 3: HTTP 200, score 92, latency 881ms, messages 24, audits 10

### Couple Decision Lead

- Score: 98
- Pass: no
- Persona: Casal em decisao conjunta, busca reduzir conflito entre preferencias.
- Emotional context: Ha desejo real, mas precisam organizar criterios.
- Source channel: site
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 100, latency 857ms, messages 26, audits 11
- Turn 2: HTTP 200, score 98, latency 906ms, messages 28, audits 12
- Turn 3: HTTP 200, score 96, latency 939ms, messages 30, audits 13

### Beach Lifestyle Lead

- Score: 97
- Pass: no
- Persona: Comprador lifestyle, compra por rotina, praia e bem-estar.
- Emotional context: Busca sensacao de vida melhor, nao so metragem.
- Source channel: instagram
- Critical violations: 1
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 100, latency 780ms, messages 32, audits 14
- Turn 2: HTTP 200, score 100, latency 786ms, messages 34, audits 15
- Turn 3: HTTP 200, score 92, latency 768ms, messages 36, audits 17

### Luxury Lead

- Score: 96
- Pass: no
- Persona: Alto padrao, valoriza exclusividade, acabamento, vista e privacidade.
- Emotional context: Quer sentir criterio e discricao, nao pressao comercial.
- Source channel: paid_social
- Critical violations: 1
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 100, latency 1216ms, messages 38, audits 18
- Turn 2: HTTP 200, score 100, latency 735ms, messages 40, audits 19
- Turn 3: HTTP 200, score 88, latency 734ms, messages 42, audits 20

### Cold Lead

- Score: 100
- Pass: yes
- Persona: Lead inicial, sem clareza de bairro, valor ou prazo.
- Emotional context: Curioso e inseguro, pode sumir se pressionado.
- Source channel: google
- Critical violations: 0
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 100, latency 775ms, messages 43, audits 20
- Turn 2: HTTP 200, score 100, latency 972ms, messages 45, audits 21

### Re-engagement Lead

- Score: 88
- Pass: no
- Persona: Lead antigo retorna apos silencio e espera continuidade.
- Emotional context: Nao quer repetir tudo; testa se a Ju lembra do contexto.
- Source channel: database_reactivation
- Critical violations: 3
- Warning violations: 0

Turns:
- Turn 1: HTTP 200, score 80, latency 1073ms, messages 48, audits 22
- Turn 2: HTTP 200, score 96, latency 999ms, messages 51, audits 24

### Financing Concern Lead

- Score: 100
- Pass: yes
- Persona: Comprador com receio de financiamento e parcelas.
- Emotional context: Quer comprar, mas sente risco financeiro.
- Source channel: site
- Critical violations: 0
- Warning violations: 2

Turns:
- Turn 1: HTTP 200, score 100, latency 2435ms, messages 2, audits 26
- Turn 2: HTTP 200, score 100, latency 745ms, messages 2, audits 26

### FGTS Lead

- Score: 91
- Pass: no
- Persona: Comprador quer usar FGTS e precisa entender viabilidade operacional.
- Emotional context: Pratico, busca clareza e reducao de burocracia.
- Source channel: google
- Critical violations: 1
- Warning violations: 2

Turns:
- Turn 1: HTTP 200, score 100, latency 714ms, messages 4, audits 27
- Turn 2: HTTP 200, score 82, latency 808ms, messages 7, audits 28

### Family Lead

- Score: 94
- Pass: no
- Persona: Familia crescendo, prioriza escola, seguranca, rotina e conforto.
- Emotional context: Busca estabilidade e qualidade de vida.
- Source channel: referral
- Critical violations: 1
- Warning violations: 2

Turns:
- Turn 1: HTTP 200, score 100, latency 967ms, messages 9, audits 29
- Turn 2: HTTP 200, score 100, latency 739ms, messages 11, audits 30
- Turn 3: HTTP 200, score 82, latency 707ms, messages 12, audits 31

### Short Stay Investor

- Score: 94
- Pass: no
- Persona: Investidor de locacao curta temporada, foco em demanda e operacao.
- Emotional context: Quer tese objetiva e cuidado com risco operacional.
- Source channel: paid_ad
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 100, latency 770ms, messages 14, audits 32
- Turn 2: HTTP 200, score 94, latency 833ms, messages 17, audits 33
- Turn 3: HTTP 200, score 88, latency 718ms, messages 19, audits 34

### High Intent Visit Lead

- Score: 93
- Pass: no
- Persona: Lead pronto para visitar, com criterio claro e timing curto.
- Emotional context: Quer agilidade, mas sem atrito ou perguntas desnecessarias.
- Source channel: site
- Critical violations: 1
- Warning violations: 1

Turns:
- Turn 1: HTTP 200, score 92, latency 716ms, messages 21, audits 35
- Turn 2: HTTP 200, score 94, latency 981ms, messages 22, audits 36

## Critical Violations

- Lead Site turn 3: missing_direct_property_presentation_signal
- Lead Instagram turn 3: missing_direct_property_presentation_signal
- Lead Instagram turn 3: asked_permission_instead_of_presenting
- Lead Referral / Indicacao turn 3: missing_direct_property_presentation_signal
- Lead Paid Ad turn 1: missing_direct_property_presentation_signal
- Lead Paid Ad turn 2: missing_direct_property_presentation_signal
- Investor Lead turn 3: missing_direct_property_presentation_signal
- Couple Decision Lead turn 3: missing_direct_property_presentation_signal
- Beach Lifestyle Lead turn 3: missing_direct_property_presentation_signal
- Luxury Lead turn 3: missing_direct_property_presentation_signal
- Re-engagement Lead turn 1: missing_direct_property_presentation_signal
- Re-engagement Lead turn 1: asked_permission_instead_of_presenting
- Re-engagement Lead turn 2: missing_direct_property_presentation_signal
- FGTS Lead turn 2: missing_direct_property_presentation_signal
- Family Lead turn 3: missing_direct_property_presentation_signal
- Short Stay Investor turn 3: missing_direct_property_presentation_signal
- High Intent Visit Lead turn 1: missing_direct_property_presentation_signal
