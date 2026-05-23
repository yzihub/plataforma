# Ju Super XML Operational QA

Teste ponta a ponta local da camada `ju-real-estate-semantic-intelligence.xml` como Institutional Semantic Governance Layer.

## Summary

- Cenários executados: 5
- Input tokens médio: 1937
- Output tokens médio: 244
- Total tokens médio: 2181
- Payload médio: 5267 bytes
- Retrieval chunks médio: 6
- Latência média: 1 ms
- Drift detectado: nao

## Scenario Logs

### 1. Lead quente

```json
{
  "utm_source": "instagram",
  "utm_campaign": "manaira_high_standard",
  "input_tokens": 1952,
  "output_tokens": 240,
  "total_tokens": 2192,
  "retrieval_chunks": 6,
  "payload_size": 5328,
  "latency_ms": 2,
  "bairro_detectado": "Manaira",
  "intent_detected": "alto_padrao",
  "conversation_stage": "refinamento",
  "matching_quality": "high",
  "geo_accuracy": "high",
  "pacing_quality": "high",
  "semantic_alignment": "high",
  "retrieval_quality": "high",
  "payload_quality": "compressed",
  "token_quality": "within_target",
  "latency_quality": "within_target",
  "drift_detected": false,
  "red_flags": []
}
```

### 2. Lead frio

```json
{
  "utm_source": "google",
  "utm_campaign": "apartamento_joao_pessoa",
  "input_tokens": 1582,
  "output_tokens": 180,
  "total_tokens": 1762,
  "retrieval_chunks": 4,
  "payload_size": 3845,
  "latency_ms": 1,
  "bairro_detectado": "Joao Pessoa",
  "intent_detected": "explorar",
  "conversation_stage": "descoberta",
  "matching_quality": "high",
  "geo_accuracy": "high",
  "pacing_quality": "high",
  "semantic_alignment": "high",
  "retrieval_quality": "high",
  "payload_quality": "compressed",
  "token_quality": "within_target",
  "latency_quality": "within_target",
  "drift_detected": false,
  "red_flags": []
}
```

### 3. Investidor

```json
{
  "utm_source": "meta_ads",
  "utm_campaign": "investimento_cabo_branco",
  "input_tokens": 2105,
  "output_tokens": 260,
  "total_tokens": 2365,
  "retrieval_chunks": 7,
  "payload_size": 5940,
  "latency_ms": 2,
  "bairro_detectado": "Cabo Branco",
  "intent_detected": "investir",
  "conversation_stage": "comparacao",
  "matching_quality": "high",
  "geo_accuracy": "high",
  "pacing_quality": "high",
  "semantic_alignment": "high",
  "retrieval_quality": "high",
  "payload_quality": "compressed",
  "token_quality": "within_target",
  "latency_quality": "within_target",
  "drift_detected": false,
  "red_flags": []
}
```

### 4. Familia

```json
{
  "utm_source": "referral",
  "utm_campaign": "familia_bessa",
  "input_tokens": 1933,
  "output_tokens": 300,
  "total_tokens": 2233,
  "retrieval_chunks": 6,
  "payload_size": 5249,
  "latency_ms": 1,
  "bairro_detectado": "Bessa",
  "intent_detected": "morar",
  "conversation_stage": "exploracao",
  "matching_quality": "high",
  "geo_accuracy": "high",
  "pacing_quality": "high",
  "semantic_alignment": "high",
  "retrieval_quality": "high",
  "payload_quality": "compressed",
  "token_quality": "within_target",
  "latency_quality": "within_target",
  "drift_detected": false,
  "red_flags": []
}
```

### 5. Alto padrao emocional

```json
{
  "utm_source": "instagram",
  "utm_campaign": "altissimo_padrao_ponta_de_campina",
  "input_tokens": 2114,
  "output_tokens": 240,
  "total_tokens": 2354,
  "retrieval_chunks": 7,
  "payload_size": 5975,
  "latency_ms": 1,
  "bairro_detectado": "Ponta de Campina",
  "intent_detected": "alto_padrao",
  "conversation_stage": "conexao_emocional",
  "matching_quality": "high",
  "geo_accuracy": "high",
  "pacing_quality": "high",
  "semantic_alignment": "high",
  "retrieval_quality": "high",
  "payload_quality": "compressed",
  "token_quality": "within_target",
  "latency_quality": "within_target",
  "drift_detected": false,
  "red_flags": []
}
```

## Retrieval Analysis

- Lead quente: conversation_governance, relational_intelligence, buyer_psychology, urban_semantics, matching_intelligence, payload_governance.
- Lead frio: conversation_governance, relational_intelligence, retrieval_governance, payload_governance.
- Investidor: acquisition_semantics, buyer_psychology, urban_semantics, geo_semantics, retrieval_governance, matching_intelligence, payload_governance.
- Familia: acquisition_semantics, conversation_governance, relational_intelligence, buyer_psychology, urban_semantics, matching_intelligence.
- Alto padrao emocional: conversation_governance, relational_intelligence, buyer_psychology, regional_semantics, geo_semantics, matching_intelligence, payload_governance.

## Token And Payload Analysis

Todos os cenários ficaram abaixo de 5000 tokens totais estimados, com payload comprimido e sem injeção do XML completo no envelope operacional.

## Pacing And GEO Analysis

Os estágios detectados variaram entre descoberta, exploração, refinamento, comparação e conexão emocional. Os bairros detectados bateram com o contexto de aquisição e mensagem atual.

## Matching And Drift Analysis

- Nenhum red flag crítico detectado.

## Recommended Optimizations

- Transformar este harness em CI para impedir regressão de macroestrutura do SUPER XML.
- Conectar o mesmo contrato ao parser JS de `consultar_imoveis` para gerar `regional_signals`, `buyer_profiles` e `semantic_cluster`.
- Medir tokens reais quando o envelope for enviado ao GPT-4.1 em staging.
- Criar fixtures com imóveis reais por bairro para validar matching operacional além da governança semântica.
