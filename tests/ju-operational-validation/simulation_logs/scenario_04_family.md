# Cenario 4 - Familia

## Contexto do Lead

familia crescendo, preocupacao com escola, rotina, seguranca e qualidade de vida

## UTM Utilizada

utm_source=referral
utm_campaign=familia_bessa

## Retrieval Realizado

Chunks recuperados: 6

1. acquisition_semantics (176 tokens estimados)
2. conversation_governance (176 tokens estimados)
3. relational_intelligence (176 tokens estimados)
4. buyer_psychology (176 tokens estimados)
5. urban_semantics (176 tokens estimados)
6. matching_intelligence (176 tokens estimados)

## Secoes XML Recuperadas

### acquisition_semantics

propaga cluster de bairro e expectativa urbana propaga tipologia e possivel perfil comprador propaga faixa de decisao e maturidade economica propaga desejo dominante: praia, familia, investimento, alto_padrao, praticidade propaga contexto de entrada e promessa criativa sem virar script desejo de qualidade de vida, mar, vista, beira-mar ou veraneio familia, bairro, condominio, portaria, rotina e estabilidade pronto para morar, porteira fechada, servicos proximos e baixo atrito alto padrao, vista definitiva, Altiplano, exclusividade e acabamento investimento, flat, studio, temporada, liquidez e rentabilidade lifestyle_praia, investidor_temporada, aposentadoria familia, casal_com_filhos, mudanc...

### conversation_governance

Responder primeiro ao contexto, emocao ou intencao imediata do cliente. Avancar uma etapa por vez, sem empilhar perguntas. Preferir respostas curtas quando nao houver necessidade de detalhe. Permitir pausas; nem toda mensagem precisa conduzir venda. Aprofundar somente quando houver curiosidade, sinal de decisao ou pergunta aberta. Quando houver duvida, reduzir pressao e ajudar a comparar criterios. Usar campos ja resolvidos e evitar reabrir qualificacao. Ao apresentar imovel, conectar no maximo uma ou duas razoes contextuais principais. Nem toda resposta precisa CTA. Nem toda resposta precisa pergunta. CTA deve existir apenas quando ha proxima acao natural: visita, envio, comparacao, revalid...

### relational_intelligence

cliente ainda organiza desejo, bairro, tipo, valor ou momento de vida perguntar pouco, inferir com cuidado e acolher ambiguidade low cliente compara regioes, tipologias e possibilidades abrir caminhos e explicar tradeoffs sem fechar cedo demais medium_when_consultative cliente ja tem criterios e precisa reduzir opcoes comparar por aderencia, rotina, valor e oportunidade targeted cliente pesa bairro, preco, planta, vista, conforto e investimento organizar diferencas em linguagem natural e curta targeted cliente quer evitar erro, pressao ou arrependimento reduzir ansiedade e propor criterio simples de decisao minimal_supportive cliente imaginou rotina, familia, praia, vista ou praticidade refo...

### buyer_psychology

morar com estabilidade, espaco, seguranca e rotina confortavel 3 quartos, 4 quartos, suites, DCE, area kids, brinquedoteca, escola, piscina, condominio fechado, sala ampla seguranca, acolhimento, conforto, privacidade, convivencia comprar com liquidez, rentabilidade e seguranca patrimonial flat, studio, temporada, diaria, mobiliado, porteira fechada, praia, valorizacao, retorno acima da media seguranca_financeira, oportunidade, baixa_friccao, renda_passiva morar ou usar imovel conectado ao mar e a uma rotina mais leve beira-mar, vista mar, poucos metros da praia, brisa, orla, pe-na-areia, Cabo Branco, Tambau, Bessa liberdade, bem_estar, contemplacao, privilegio, qualidade_de_vida comprar qua...

### urban_semantics

bairro de desejo consolidado, vida urbana costeira, turismo, servicos e alta liquidez coracao de Tambau, poucos metros do mar, shopping, restaurantes, servicos, valorizacao investidor, lifestyle_praia, casal_jovem, aposentadoria, comprador_de_fora bairro valorizado, urbano, com infraestrutura forte e apelo de vista mar em produtos especificos area valorizada, servicos, vista definitiva, praticidade, conforto familia, investidor, casal_jovem, alto_padrao litoral residencial em crescimento, mistura moradia, investimento, praia e casas familiares beira-mar, praia do Bessa, casa, flat, studios, temporada, localizacao estrategica familia, investidor_temporada, lifestyle_praia, casal_jovem zona co...

### matching_intelligence

filtros objetivos: bairro, tipo, quartos, valor, codigo_ref sinais regionais: nascente_sul, posicao_sul, DCE, vista_mar, pe_na_areia, projetados buyer profile: familia, investidor, lifestyle_praia, alto_padrao, casal_jovem, home_office, aposentadoria momento relacional: descoberta, refinamento, comparacao, hesitacao, quase_decisao contexto de aquisicao: UTM, campanha, GEO, promessa criativa family_score beach_score luxury_score investment_score comfort_score convenience_score urban_score remote_work_score regional_value_score matching deve explicar aderencia por criterio, nao por lista fria campanha pode informar pesos iniciais, mas nunca sobrescrever intencao declarada ranking deve favorece...

## Payload Enviado ao GPT

```json
{
  "qa_type": "institutional_semantic_behavior_validation",
  "architecture": {
    "hot_memory": "Redis",
    "semantic_memory": "Supabase Vector",
    "governance_layer": "SUPER XML",
    "parser": "JS lightweight operational interpretation",
    "orchestration": "n8n lightweight support",
    "language_model": "GPT-4.1 contextual language adaptation",
    "truth_rule": "LLM fala; backend decide; banco guarda verdade",
    "agno_hotpath": false
  },
  "lead_context": {
    "utm_source": "referral",
    "utm_campaign": "familia_bessa",
    "profile": "familia crescendo, preocupacao com escola, rotina, seguranca e qualidade de vida",
    "current_message": "A familia esta crescendo e a gente queria algo no Bessa ou perto, com rotina boa, escola por perto e seguranca.",
    "bairro_detectado": "Bessa",
    "intent_detected": "morar",
    "conversation_stage": "exploracao",
    "maturity": "media",
    "emotional_context": "familia buscando seguranca e rotina sustentavel"
  },
  "retrieved_xml_sections": [
    {
      "section": "acquisition_semantics",
      "excerpt": "propaga cluster de bairro e expectativa urbana propaga tipologia e possivel perfil comprador propaga faixa de decisao e maturidade economica propaga desejo dominante: praia, familia, investimento, alto_padrao, praticidade propaga contexto de entrada e promessa criativa sem virar script desejo de qualidade de vida, mar, vista, beira-mar ou veraneio familia, bairro, condominio, portaria, rotina e estabilidade pronto para morar, porteira fechada, servicos proximos e baixo atrito alto padrao, vista definitiva, Altiplano, exclusividade e acabamento investimento, flat, studio, temporada, liquidez e rentabilidade lifestyle_praia, investidor_temporada, aposentadoria familia, casal_com_filhos, mudanc..."
    },
    {
      "section": "conversation_governance",
      "excerpt": "Responder primeiro ao contexto, emocao ou intencao imediata do cliente. Avancar uma etapa por vez, sem empilhar perguntas. Preferir respostas curtas quando nao houver necessidade de detalhe. Permitir pausas; nem toda mensagem precisa conduzir venda. Aprofundar somente quando houver curiosidade, sinal de decisao ou pergunta aberta. Quando houver duvida, reduzir pressao e ajudar a comparar criterios. Usar campos ja resolvidos e evitar reabrir qualificacao. Ao apresentar imovel, conectar no maximo uma ou duas razoes contextuais principais. Nem toda resposta precisa CTA. Nem toda resposta precisa pergunta. CTA deve existir apenas quando ha proxima acao natural: visita, envio, comparacao, revalid..."
    },
    {
      "section": "relational_intelligence",
      "excerpt": "cliente ainda organiza desejo, bairro, tipo, valor ou momento de vida perguntar pouco, inferir com cuidado e acolher ambiguidade low cliente compara regioes, tipologias e possibilidades abrir caminhos e explicar tradeoffs sem fechar cedo demais medium_when_consultative cliente ja tem criterios e precisa reduzir opcoes comparar por aderencia, rotina, valor e oportunidade targeted cliente pesa bairro, preco, planta, vista, conforto e investimento organizar diferencas em linguagem natural e curta targeted cliente quer evitar erro, pressao ou arrependimento reduzir ansiedade e propor criterio simples de decisao minimal_supportive cliente imaginou rotina, familia, praia, vista ou praticidade refo..."
    },
    {
      "section": "buyer_psychology",
      "excerpt": "morar com estabilidade, espaco, seguranca e rotina confortavel 3 quartos, 4 quartos, suites, DCE, area kids, brinquedoteca, escola, piscina, condominio fechado, sala ampla seguranca, acolhimento, conforto, privacidade, convivencia comprar com liquidez, rentabilidade e seguranca patrimonial flat, studio, temporada, diaria, mobiliado, porteira fechada, praia, valorizacao, retorno acima da media seguranca_financeira, oportunidade, baixa_friccao, renda_passiva morar ou usar imovel conectado ao mar e a uma rotina mais leve beira-mar, vista mar, poucos metros da praia, brisa, orla, pe-na-areia, Cabo Branco, Tambau, Bessa liberdade, bem_estar, contemplacao, privilegio, qualidade_de_vida comprar qua..."
    },
    {
      "section": "urban_semantics",
      "excerpt": "bairro de desejo consolidado, vida urbana costeira, turismo, servicos e alta liquidez coracao de Tambau, poucos metros do mar, shopping, restaurantes, servicos, valorizacao investidor, lifestyle_praia, casal_jovem, aposentadoria, comprador_de_fora bairro valorizado, urbano, com infraestrutura forte e apelo de vista mar em produtos especificos area valorizada, servicos, vista definitiva, praticidade, conforto familia, investidor, casal_jovem, alto_padrao litoral residencial em crescimento, mistura moradia, investimento, praia e casas familiares beira-mar, praia do Bessa, casa, flat, studios, temporada, localizacao estrategica familia, investidor_temporada, lifestyle_praia, casal_jovem zona co..."
    },
    {
      "section": "matching_intelligence",
      "excerpt": "filtros objetivos: bairro, tipo, quartos, valor, codigo_ref sinais regionais: nascente_sul, posicao_sul, DCE, vista_mar, pe_na_areia, projetados buyer profile: familia, investidor, lifestyle_praia, alto_padrao, casal_jovem, home_office, aposentadoria momento relacional: descoberta, refinamento, comparacao, hesitacao, quase_decisao contexto de aquisicao: UTM, campanha, GEO, promessa criativa family_score beach_score luxury_score investment_score comfort_score convenience_score urban_score remote_work_score regional_value_score matching deve explicar aderencia por criterio, nao por lista fria campanha pode informar pesos iniciais, mas nunca sobrescrever intencao declarada ranking deve favorece..."
    }
  ],
  "behavioral_constraints": {
    "answer_as_ju": true,
    "no_markdown": true,
    "no_bullets": true,
    "no_hype": true,
    "no_sdr_behavior": true,
    "no_property_or_price_invention": true,
    "no_url_invention": true,
    "no_runtime_explanation_to_customer": true,
    "cta_moderation": true,
    "semantic_intelligence_on_demand": true
  },
  "expected_behavior": "trust building, inferencia familiar, bairros coerentes e ritmo relacional"
}
```

## Conversa Completa

Cliente: A familia esta crescendo e a gente queria algo no Bessa ou perto, com rotina boa, escola por perto e seguranca.

Ju: Oi, tudo bem? Entendo bem esse momento de mudança, ainda mais com a família crescendo. O Bessa realmente oferece uma rotina mais tranquila, com escolas por perto e aquela sensação de segurança que faz diferença no dia a dia. Se quiser, posso ajudar a pensar em opções ali ou em bairros próximos que também atendam esse perfil familiar, sempre priorizando praticidade e conforto para vocês. Fique à vontade para ir me contando o que é essencial para a rotina de vocês.

## Métricas Operacionais

provider: openai_responses
model: gpt-4.1-2025-04-14
input_tokens: 1616
output_tokens: 98
total_tokens: 1714
latency_ms: 3775
retrieval_chunks: 6
payload_size: 5785

## Pacing Analysis

pacing institucional aderente ao estagio

## GEO Inference

bairro/regiao coerente: Bessa

## Acquisition Inference

UTM referral/familia_bessa alinhada a morar

## Matching Analysis

matching contextual emergiu sem ficha tecnica

## Drift Detection

sem drift comportamental critico

## Semantic Compression Analysis

payload comprimido; XML completo nao foi injetado
