# Ju Behavioral E2E Audit Report

- Run ID: 2026-05-23T23-49-54-142Z
- Endpoint: https://api.yzihub.com/webhook/ju
- Mode: live curl execution
- Started: 2026-05-23T23:49:54.146Z
- Finished: 2026-05-23T23:50:45.597Z
- Scenarios: 15
- Turns: 39
- Passing scenarios: 2/15
- Average behavioral score: 95

## Scenario Results

### Lead Site

- Score: 96
- Pass: no
- Persona: Comprador direto do site, ja navegou por imoveis e quer orientacao sem recomecar qualificacao.
- Emotional context: Curioso, com interesse real, mas ainda comparando regioes.
- Source channel: site
- Critical violations: 1
- Warning violations: 0

Expected behavior:
- Reconhecer que o lead ja pesquisou e nao tratar como contato frio.
- Contextualizar Bessa/Jardim Oceania em linguagem consultiva.
- Quando houver criterio suficiente, apresentar opcoes diretamente.
- Evitar perguntar tudo de novo antes de ajudar.

Validation checklist:
- Reconhece origem site ou pesquisa previa.
- Usa bairros citados como memoria operacional.
- Nao pede permissao para apresentar imovel quando ha intencao.
- Se envia URL, usa URL pura e valida em linha propria.

Turns:
- Turn 1: HTTP 200, score 100, latency 1364ms, violations 0
- Turn 2: HTTP 200, score 100, latency 686ms, violations 0
- Turn 3: HTTP 200, score 88, latency 696ms, violations 1

### Lead Instagram

- Score: 96
- Pass: no
- Persona: Lead vindo de conteudo visual, responde por impulso a um post ou story.
- Emotional context: Quer algo bonito e pratico, mas ainda fala de forma leve.
- Source channel: instagram
- Critical violations: 1
- Warning violations: 0

Expected behavior:
- Usar tom natural, sem virar atendimento corporativo.
- Traduzir 'perto da praia' em criterios de bairro, rotina e produto.
- Nao exagerar emojis.
- Apresentar opcoes quando o usuario sinalizar abertura.

Validation checklist:
- Nao usa linguagem artificial de marketing.
- Nao chama o cliente pelo nome repetidamente.
- Conecta estetica/praia com rotina.
- Aciona consultar_imoveis quando ha pedido de opcao.

Turns:
- Turn 1: HTTP 200, score 100, latency 689ms, violations 0
- Turn 2: HTTP 200, score 100, latency 725ms, violations 0
- Turn 3: HTTP 200, score 88, latency 644ms, violations 1

### Lead Referral / Indicacao

- Score: 96
- Pass: no
- Persona: Lead indicado por conhecido, chega com confianca inicial e espera atendimento mais pessoal.
- Emotional context: Menos desconfiado, mas quer sentir cuidado e criterio.
- Source channel: referral
- Critical violations: 1
- Warning violations: 0

Expected behavior:
- Reconhecer a indicacao sem exagerar.
- Tratar a compra para mae com cuidado emocional.
- Perguntar pouco e de forma util.
- Priorizar seguranca, rotina, acesso e conforto.

Validation checklist:
- Menciona cuidado com rotina da mae.
- Nao empilha perguntas.
- Mantem o contexto familiar nos turnos seguintes.
- Nao força produto de investimento.

Turns:
- Turn 1: HTTP 200, score 100, latency 583ms, violations 0
- Turn 2: HTTP 200, score 100, latency 778ms, violations 0
- Turn 3: HTTP 200, score 88, latency 658ms, violations 1

### Lead Paid Ad

- Score: 88
- Pass: no
- Persona: Lead de anuncio pago, clicou por oferta e pode ter expectativa de produto especifico.
- Emotional context: Interesse rapido, sensivel a preco e aderencia do anuncio.
- Source channel: paid_ad
- Critical violations: 2
- Warning violations: 0

Expected behavior:
- Tratar como pergunta transacional e revalidar disponibilidade com ferramenta.
- Nao inventar disponibilidade.
- Nao reconstruir link.
- Se nao encontrar o exato, explicar com naturalidade e sugerir alternativa proxima.

Validation checklist:
- Aciona consultar_imoveis.
- Nao afirma disponibilidade sem lastro.
- Nao usa URL fora do retorno da ferramenta.
- Resposta e curta e objetiva.

Turns:
- Turn 1: HTTP 200, score 88, latency 669ms, violations 1
- Turn 2: HTTP 200, score 88, latency 665ms, violations 1

### Investor Lead

- Score: 96
- Pass: no
- Persona: Investidor racional, compara retorno, liquidez e valorizacao.
- Emotional context: Analitico, quer reduzir risco e entender tese.
- Source channel: meta_ads
- Critical violations: 1
- Warning violations: 0

Expected behavior:
- Responder com tese de investimento sem prometer rentabilidade.
- Falar de liquidez, demanda e perfil do bairro.
- Evitar linguagem emocional excessiva.
- Apresentar imoveis diretamente quando houver criterio.

Validation checklist:
- Nao promete rentabilidade.
- Contextualiza Cabo Branco.
- Diferencia moradia, temporada e revenda.
- Aciona tool quando pede opcoes.

Turns:
- Turn 1: HTTP 200, score 100, latency 720ms, violations 0
- Turn 2: HTTP 200, score 100, latency 820ms, violations 0
- Turn 3: HTTP 200, score 88, latency 673ms, violations 1

### Couple Decision Lead

- Score: 96
- Pass: no
- Persona: Casal em decisao conjunta, busca reduzir conflito entre preferencias.
- Emotional context: Ha desejo real, mas precisam organizar criterios.
- Source channel: site
- Critical violations: 1
- Warning violations: 0

Expected behavior:
- Organizar tradeoff do casal sem tomar partido.
- Nao fazer interrogatorio.
- Usar linguagem de decisao compartilhada.
- Apresentar opcoes que conciliem criterios.

Validation checklist:
- Reconhece dois decisores.
- Compara Manaira/Tambau.
- Preserva praticidade + praia.
- Apresenta opcao quando solicitada.

Turns:
- Turn 1: HTTP 200, score 100, latency 665ms, violations 0
- Turn 2: HTTP 200, score 100, latency 769ms, violations 0
- Turn 3: HTTP 200, score 88, latency 785ms, violations 1

### Beach Lifestyle Lead

- Score: 96
- Pass: no
- Persona: Comprador lifestyle, compra por rotina, praia e bem-estar.
- Emotional context: Busca sensacao de vida melhor, nao so metragem.
- Source channel: instagram
- Critical violations: 1
- Warning violations: 0

Expected behavior:
- Alinhar emocionalmente com estilo de vida.
- Conectar praia com rotina real.
- Evitar exagero poetico ou marketing.
- Apresentar imovel quando houver pedido de opcoes.

Validation checklist:
- Usa praia como criterio pratico.
- Nao transforma em texto publicitario.
- Nao perde a intencao de moradia.
- Faz recomendacao direta quando apropriado.

Turns:
- Turn 1: HTTP 200, score 100, latency 716ms, violations 0
- Turn 2: HTTP 200, score 100, latency 705ms, violations 0
- Turn 3: HTTP 200, score 88, latency 770ms, violations 1

### Luxury Lead

- Score: 96
- Pass: no
- Persona: Alto padrao, valoriza exclusividade, acabamento, vista e privacidade.
- Emotional context: Quer sentir criterio e discricao, nao pressao comercial.
- Source channel: paid_social
- Critical violations: 1
- Warning violations: 0

Expected behavior:
- Responder com sofisticao contida.
- Nao usar hype nem superlativos vazios.
- Entender exclusividade como criterio de escolha.
- Apresentar opcoes diretamente quando houver abertura.

Validation checklist:
- Nao vulgariza alto padrao.
- Contextualiza Ponta de Campina.
- Mantem tom discreto.
- Nao empilha perguntas financeiras.

Turns:
- Turn 1: HTTP 200, score 100, latency 649ms, violations 0
- Turn 2: HTTP 200, score 100, latency 676ms, violations 0
- Turn 3: HTTP 200, score 88, latency 737ms, violations 1

### Cold Lead

- Score: 100
- Pass: yes
- Persona: Lead inicial, sem clareza de bairro, valor ou prazo.
- Emotional context: Curioso e inseguro, pode sumir se pressionado.
- Source channel: google
- Critical violations: 0
- Warning violations: 0

Expected behavior:
- Baixar pressao.
- Ajudar a organizar criterio inicial.
- Nao tentar fechar visita.
- Nao perguntar muitas coisas de uma vez.

Validation checklist:
- Nao força proxima acao.
- Resposta curta e acolhedora.
- Uma pergunta no maximo, se necessaria.
- Sem tool se nao ha criterio suficiente.

Turns:
- Turn 1: HTTP 200, score 100, latency 755ms, violations 0
- Turn 2: HTTP 200, score 100, latency 764ms, violations 0

### Re-engagement Lead

- Score: 88
- Pass: no
- Persona: Lead antigo retorna apos silencio e espera continuidade.
- Emotional context: Nao quer repetir tudo; testa se a Ju lembra do contexto.
- Source channel: database_reactivation
- Critical violations: 2
- Warning violations: 0

Expected behavior:
- Tentar usar memoria e, se necessario, revalidar com ferramenta.
- Nao fingir que lembra se nao houver dado.
- Nao pedir para o cliente explicar tudo de novo.
- Revalidar URL/disponibilidade quando mencionar imovel anterior.

Validation checklist:
- Usa tom de continuidade.
- Aciona consultar_imoveis para revalidar imovel anterior.
- Nao inventa qual era o apartamento.
- Se faltar memoria, pede um minimo de ancoragem.

Turns:
- Turn 1: HTTP 200, score 88, latency 710ms, violations 1
- Turn 2: HTTP 200, score 88, latency 669ms, violations 1

### Financing Concern Lead

- Score: 100
- Pass: yes
- Persona: Comprador com receio de financiamento e parcelas.
- Emotional context: Quer comprar, mas sente risco financeiro.
- Source channel: site
- Critical violations: 0
- Warning violations: 0

Expected behavior:
- Acolher a preocupacao sem empurrar imovel.
- Falar em simular, organizar faixa e entrada sem prometer aprovacao.
- Nao dar conselho financeiro definitivo.
- Sugerir proximo passo leve.

Validation checklist:
- Nao promete credito aprovado.
- Mostra caminho de decisao.
- Pergunta pouco.
- Mantem tom consultivo.

Turns:
- Turn 1: HTTP 200, score 100, latency 687ms, violations 0
- Turn 2: HTTP 200, score 100, latency 927ms, violations 0

### FGTS Lead

- Score: 94
- Pass: no
- Persona: Comprador quer usar FGTS e precisa entender viabilidade operacional.
- Emotional context: Pratico, busca clareza e reducao de burocracia.
- Source channel: google
- Critical violations: 1
- Warning violations: 0

Expected behavior:
- Responder de forma clara e prudente.
- Explicar que depende de regras e perfil, sem juridiquês.
- Nao pedir documentos imediatamente.
- Conectar FGTS com busca de imovel se houver intencao.

Validation checklist:
- Nao garante elegibilidade.
- Explica em linguagem simples.
- Nao vira checklist documental.
- Mantem conversa fluida.

Turns:
- Turn 1: HTTP 200, score 100, latency 728ms, violations 0
- Turn 2: HTTP 200, score 88, latency 699ms, violations 1

### Family Lead

- Score: 96
- Pass: no
- Persona: Familia crescendo, prioriza escola, seguranca, rotina e conforto.
- Emotional context: Busca estabilidade e qualidade de vida.
- Source channel: referral
- Critical violations: 1
- Warning violations: 0

Expected behavior:
- Priorizar rotina familiar.
- Evitar tratar como investimento.
- Contextualizar bairro sem exagerar.
- Apresentar opcoes quando criterio estiver suficiente.

Validation checklist:
- Fala de rotina, escola e seguranca.
- Mantem Bessa como referencia.
- Nao reabre criterios ja informados.
- Apresenta imovel diretamente quando pedido.

Turns:
- Turn 1: HTTP 200, score 100, latency 789ms, violations 0
- Turn 2: HTTP 200, score 100, latency 675ms, violations 0
- Turn 3: HTTP 200, score 88, latency 1035ms, violations 1

### Short Stay Investor

- Score: 96
- Pass: no
- Persona: Investidor de locacao curta temporada, foco em demanda e operacao.
- Emotional context: Quer tese objetiva e cuidado com risco operacional.
- Source channel: paid_ad
- Critical violations: 1
- Warning violations: 0

Expected behavior:
- Falar de demanda e operacao sem prometer retorno.
- Diferenciar produto para temporada de moradia.
- Priorizar localizacao, condominio e liquidez.
- Apresentar opcoes quando solicitado.

Validation checklist:
- Nao promete rentabilidade.
- Reconhece short stay como objetivo especifico.
- Nao mistura com compra familiar.
- Aciona tool para opcoes.

Turns:
- Turn 1: HTTP 200, score 100, latency 1082ms, violations 0
- Turn 2: HTTP 200, score 100, latency 682ms, violations 0
- Turn 3: HTTP 200, score 88, latency 1253ms, violations 1

### High Intent Visit Lead

- Score: 94
- Pass: no
- Persona: Lead pronto para visitar, com criterio claro e timing curto.
- Emotional context: Quer agilidade, mas sem atrito ou perguntas desnecessarias.
- Source channel: site
- Critical violations: 1
- Warning violations: 0

Expected behavior:
- Revalidar disponibilidade com tool.
- Nao pedir permissao para mostrar.
- Conduzir para visita de forma objetiva.
- Nao empilhar perguntas antes de checar o imovel.

Validation checklist:
- Aciona consultar_imoveis.
- Responde com agilidade.
- Sugere proxima acao de agenda sem friccao.
- Nao inventa disponibilidade.

Turns:
- Turn 1: HTTP 200, score 88, latency 659ms, violations 1
- Turn 2: HTTP 200, score 100, latency 624ms, violations 0

## Critical Violations

- Lead Site turn 3: missing_direct_property_presentation_signal
- Lead Instagram turn 3: missing_direct_property_presentation_signal
- Lead Referral / Indicacao turn 3: missing_direct_property_presentation_signal
- Lead Paid Ad turn 1: missing_direct_property_presentation_signal
- Lead Paid Ad turn 2: missing_direct_property_presentation_signal
- Investor Lead turn 3: missing_direct_property_presentation_signal
- Couple Decision Lead turn 3: missing_direct_property_presentation_signal
- Beach Lifestyle Lead turn 3: missing_direct_property_presentation_signal
- Luxury Lead turn 3: missing_direct_property_presentation_signal
- Re-engagement Lead turn 1: missing_direct_property_presentation_signal
- Re-engagement Lead turn 2: missing_direct_property_presentation_signal
- FGTS Lead turn 2: missing_direct_property_presentation_signal
- Family Lead turn 3: missing_direct_property_presentation_signal
- Short Stay Investor turn 3: missing_direct_property_presentation_signal
- High Intent Visit Lead turn 1: missing_direct_property_presentation_signal

## Regression Notes

Compare this report with `baselines/latest-summary.json`. Regressions are scenario score drops, new critical violations, new forbidden phrases, increased latency, and missing property-presentation signals on high-intent turns.
