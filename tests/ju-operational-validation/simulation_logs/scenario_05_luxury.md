# Cenario 5 - Alto padrao emocional

## Contexto do Lead

lifestyle-driven, estetica, exclusividade e status implicito

## UTM Utilizada

utm_source=instagram
utm_campaign=altissimo_padrao_ponta_de_campina

## Retrieval Realizado

Chunks recuperados: 7

1. conversation_governance (176 tokens estimados)
2. relational_intelligence (176 tokens estimados)
3. buyer_psychology (176 tokens estimados)
4. regional_semantics (176 tokens estimados)
5. geo_semantics (131 tokens estimados)
6. matching_intelligence (176 tokens estimados)
7. payload_governance (176 tokens estimados)

## Secoes XML Recuperadas

### conversation_governance

Responder primeiro ao contexto, emocao ou intencao imediata do cliente. Avancar uma etapa por vez, sem empilhar perguntas. Preferir respostas curtas quando nao houver necessidade de detalhe. Permitir pausas; nem toda mensagem precisa conduzir venda. Aprofundar somente quando houver curiosidade, sinal de decisao ou pergunta aberta. Quando houver duvida, reduzir pressao e ajudar a comparar criterios. Usar campos ja resolvidos e evitar reabrir qualificacao. Ao apresentar imovel, conectar no maximo uma ou duas razoes contextuais principais. Nem toda resposta precisa CTA. Nem toda resposta precisa pergunta. CTA deve existir apenas quando ha proxima acao natural: visita, envio, comparacao, revalid...

### relational_intelligence

cliente ainda organiza desejo, bairro, tipo, valor ou momento de vida perguntar pouco, inferir com cuidado e acolher ambiguidade low cliente compara regioes, tipologias e possibilidades abrir caminhos e explicar tradeoffs sem fechar cedo demais medium_when_consultative cliente ja tem criterios e precisa reduzir opcoes comparar por aderencia, rotina, valor e oportunidade targeted cliente pesa bairro, preco, planta, vista, conforto e investimento organizar diferencas em linguagem natural e curta targeted cliente quer evitar erro, pressao ou arrependimento reduzir ansiedade e propor criterio simples de decisao minimal_supportive cliente imaginou rotina, familia, praia, vista ou praticidade refo...

### buyer_psychology

morar com estabilidade, espaco, seguranca e rotina confortavel 3 quartos, 4 quartos, suites, DCE, area kids, brinquedoteca, escola, piscina, condominio fechado, sala ampla seguranca, acolhimento, conforto, privacidade, convivencia comprar com liquidez, rentabilidade e seguranca patrimonial flat, studio, temporada, diaria, mobiliado, porteira fechada, praia, valorizacao, retorno acima da media seguranca_financeira, oportunidade, baixa_friccao, renda_passiva morar ou usar imovel conectado ao mar e a uma rotina mais leve beira-mar, vista mar, poucos metros da praia, brisa, orla, pe-na-areia, Cabo Branco, Tambau, Bessa liberdade, bem_estar, contemplacao, privilegio, qualidade_de_vida comprar qua...

### regional_semantics

nascente sul, sul/nascente, posicao nascente sul ventilacao constante, iluminacao natural suave, ambientes mais frescos e bem-estar diario muito relevante em Joao Pessoa por conforto termico comfort_high regional_value_high posicao sul, sul ambiente mais ameno, ventilado e agradavel ao longo do dia diferencial tecnico local comfort_medium DCE, dependencia completa, quarto de dependencia com banheiro apoio domestico, quarto reversivel, home office, deposito ou espaco multiuso sinal de planta ampla, tradicional e funcional family_medium versatility_high varanda gourmet, espaco gourmet, area gourmet, churrasqueira convivencia, lazer privado, extensao da sala e vida social domestica forte em fam...

### geo_semantics

Tambau, Manaira, Cabo Branco, Bessa, Jardim Oceania praia com servicos, liquidez, walkability e rotina urbana morar_perto_do_mar Intermares, Areia Dourada, Cabedelo praia residencial, veraneio, condominio e expansao de valor praia_residencial_e_veraneio Altiplano, Manaira premium, Cabo Branco premium status, vista, acabamento, exclusividade e condominio-clube alto_padrao_litoral Aeroclube, Bairro dos Estados, areas de facil acesso mobilidade, conveniencia, primeira moradia e investimento funcional vida_urbana_pratica

### matching_intelligence

filtros objetivos: bairro, tipo, quartos, valor, codigo_ref sinais regionais: nascente_sul, posicao_sul, DCE, vista_mar, pe_na_areia, projetados buyer profile: familia, investidor, lifestyle_praia, alto_padrao, casal_jovem, home_office, aposentadoria momento relacional: descoberta, refinamento, comparacao, hesitacao, quase_decisao contexto de aquisicao: UTM, campanha, GEO, promessa criativa family_score beach_score luxury_score investment_score comfort_score convenience_score urban_score remote_work_score regional_value_score matching deve explicar aderencia por criterio, nao por lista fria campanha pode informar pesos iniciais, mas nunca sobrescrever intencao declarada ranking deve favorece...

### payload_governance

descricao_imovel, titulo_comercial, titulo_seo, tipo_de_imovel, bairro, cidade, UTM, contexto do lead tags, regional_signals, buyer_profiles, emotional_signals, semantic_cluster, scores e operational_summary contexto leve do lead, objetivo, top imoveis, cards, URL da tool, operational_summary, tags relevantes e scores essenciais descricao_imovel completa, HTML, metadata WordPress, transcript gigante, ranking bruto completo, estados cognitivos abstratos reduzir tokens antes de chamar GPT limitar imoveis enviados ao top contextual preferir resumo operacional a texto comercial usar retrieval leve e cirurgico URL de imovel vem somente de consultar_imoveis nunca reconstruir slug, link ou rota por...

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
    "utm_source": "instagram",
    "utm_campaign": "altissimo_padrao_ponta_de_campina",
    "profile": "lifestyle-driven, estetica, exclusividade e status implicito",
    "current_message": "A gente busca algo mais exclusivo, com uma estetica muito boa e uma sensacao diferente. Ponta de Campina nos chama atencao.",
    "bairro_detectado": "Ponta de Campina",
    "intent_detected": "alto_padrao",
    "conversation_stage": "conexao_emocional",
    "maturity": "media_alta",
    "emotional_context": "desejo estetico, exclusividade e status implicito"
  },
  "retrieved_xml_sections": [
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
      "section": "regional_semantics",
      "excerpt": "nascente sul, sul/nascente, posicao nascente sul ventilacao constante, iluminacao natural suave, ambientes mais frescos e bem-estar diario muito relevante em Joao Pessoa por conforto termico comfort_high regional_value_high posicao sul, sul ambiente mais ameno, ventilado e agradavel ao longo do dia diferencial tecnico local comfort_medium DCE, dependencia completa, quarto de dependencia com banheiro apoio domestico, quarto reversivel, home office, deposito ou espaco multiuso sinal de planta ampla, tradicional e funcional family_medium versatility_high varanda gourmet, espaco gourmet, area gourmet, churrasqueira convivencia, lazer privado, extensao da sala e vida social domestica forte em fam..."
    },
    {
      "section": "geo_semantics",
      "excerpt": "Tambau, Manaira, Cabo Branco, Bessa, Jardim Oceania praia com servicos, liquidez, walkability e rotina urbana morar_perto_do_mar Intermares, Areia Dourada, Cabedelo praia residencial, veraneio, condominio e expansao de valor praia_residencial_e_veraneio Altiplano, Manaira premium, Cabo Branco premium status, vista, acabamento, exclusividade e condominio-clube alto_padrao_litoral Aeroclube, Bairro dos Estados, areas de facil acesso mobilidade, conveniencia, primeira moradia e investimento funcional vida_urbana_pratica"
    },
    {
      "section": "matching_intelligence",
      "excerpt": "filtros objetivos: bairro, tipo, quartos, valor, codigo_ref sinais regionais: nascente_sul, posicao_sul, DCE, vista_mar, pe_na_areia, projetados buyer profile: familia, investidor, lifestyle_praia, alto_padrao, casal_jovem, home_office, aposentadoria momento relacional: descoberta, refinamento, comparacao, hesitacao, quase_decisao contexto de aquisicao: UTM, campanha, GEO, promessa criativa family_score beach_score luxury_score investment_score comfort_score convenience_score urban_score remote_work_score regional_value_score matching deve explicar aderencia por criterio, nao por lista fria campanha pode informar pesos iniciais, mas nunca sobrescrever intencao declarada ranking deve favorece..."
    },
    {
      "section": "payload_governance",
      "excerpt": "descricao_imovel, titulo_comercial, titulo_seo, tipo_de_imovel, bairro, cidade, UTM, contexto do lead tags, regional_signals, buyer_profiles, emotional_signals, semantic_cluster, scores e operational_summary contexto leve do lead, objetivo, top imoveis, cards, URL da tool, operational_summary, tags relevantes e scores essenciais descricao_imovel completa, HTML, metadata WordPress, transcript gigante, ranking bruto completo, estados cognitivos abstratos reduzir tokens antes de chamar GPT limitar imoveis enviados ao top contextual preferir resumo operacional a texto comercial usar retrieval leve e cirurgico URL de imovel vem somente de consultar_imoveis nunca reconstruir slug, link ou rota por..."
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
  "expected_behavior": "sofisticacao contextual, exclusividade implicita, sem hype e sem venda agressiva"
}
```

## Conversa Completa

Cliente: A gente busca algo mais exclusivo, com uma estetica muito boa e uma sensacao diferente. Ponta de Campina nos chama atencao.

Ju: Oi, tudo bem? Ponta de Campina realmente tem um clima diferente, né? A região consegue unir aquele toque de exclusividade com uma estética que chama atenção, principalmente para quem busca algo mais reservado, com detalhes que se destacam sem precisar exagerar. O bairro traz essa sensação de estar num lugar especial, com uma atmosfera mais tranquila, perto do mar, mas sem abrir mão de conforto e privacidade. Se quiser conversar mais sobre o que faz sentido pra vocês ou aprofundar em algum detalhe, é só me sinalizar.

## Métricas Operacionais

provider: openai_responses
model: gpt-4.1-2025-04-14
input_tokens: 1749
output_tokens: 109
total_tokens: 1858
latency_ms: 1905
retrieval_chunks: 7
payload_size: 6399

## Pacing Analysis

pacing institucional aderente ao estagio

## GEO Inference

bairro/regiao coerente: Ponta de Campina

## Acquisition Inference

UTM instagram/altissimo_padrao_ponta_de_campina alinhada a alto_padrao

## Matching Analysis

matching contextual emergiu sem ficha tecnica

## Drift Detection

sem drift comportamental critico

## Semantic Compression Analysis

payload comprimido; XML completo nao foi injetado
