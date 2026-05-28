# Ju Runtime - Behavioral Transcripts



Generated at: 2026-05-28T06:36:27.407Z



Fonte: suite local deterministica de behavioral simulations. Este export nao usa Evolution API, WhatsApp real, webhook externo, outbound ou execucao de tools.



Objetivo: permitir revisao humana de naturalidade, fluidez, contextualizacao, ritmo consultivo, warmth, excesso de perguntas, sensacao de SDR, sensacao de IA, rigidez de policy e qualidade do framing institucional.



# Cenario: Lead Objetivo

Lead:
quero apartamento no bessa

Stage:
QUALIFICACAO_MINIMA

Runtime State:
matching

Behavioral Contract:

* version: ju_behavioral_contracts_v1_phase_1
* objective: entender intencao inicial sem transformar a conversa em interrogatorio
* max_questions: 1
* max_consecutive_questions: 2
* question_budget_per_stage: 2
* remaining_consecutive_questions: 2
* contextualization_required: true
* must_generate_value_before_more_questions: true
* must_explain_consultive_model: false
* must_request_permission_to_continue: false

Ju:
Bessa ajuda bastante. Ja consigo separar boas opcoes por ali; depois a gente ajusta pelo que fizer sentido.

Runtime Signals:

* question_count: 0
* presentation_due: true
* contextualization_detected: true
* behavioral_contract_applied: true
* tools_called: consultar_imoveis
* property_cards_count: 2

Violacoes Detectadas:

* runtime_violations: none
* expectation_failures: none

Behavioral Analysis:

* pacing: direto
* tamanho resposta: media
* contextualizacao: presente
* warmth: presente
* espontaneidade: boa
* previsibilidade: baixa
* SDR regression: baixa
* fluidez: boa
* friccao: baixa
* corporatives: baixo
* sensacao IA: baixa
* rigidez policy: baixa

# Cenario: Lead Frio

Lead:
tem imovel?

Stage:
SAUDACAO

Runtime State:
lead_novo

Behavioral Contract:

* version: ju_behavioral_contracts_v1_phase_1
* objective: criar confianca, explicar modelo consultivo e obter consentimento contextual
* max_questions: 1
* max_consecutive_questions: 1
* question_budget_per_stage: 1
* remaining_consecutive_questions: 1
* contextualization_required: true
* must_generate_value_before_more_questions: true
* must_explain_consultive_model: true
* must_request_permission_to_continue: true

Ju:
Tenho sim. Pra eu nao te mandar coisa aleatoria: e pra morar ou investir?

Runtime Signals:

* question_count: 1
* presentation_due: false
* contextualization_detected: true
* behavioral_contract_applied: true
* tools_called: none
* property_cards_count: 0

Violacoes Detectadas:

* runtime_violations: none
* expectation_failures: none

Behavioral Analysis:

* pacing: bom
* tamanho resposta: curta
* contextualizacao: presente
* warmth: presente
* espontaneidade: boa
* previsibilidade: baixa
* SDR regression: baixa
* fluidez: boa
* friccao: baixa
* corporatives: baixo
* sensacao IA: baixa
* rigidez policy: baixa

# Cenario: Lead Investidor

Lead:
procuro imovel para investir

Stage:
QUALIFICACAO_MINIMA

Runtime State:
matching

Behavioral Contract:

* version: ju_behavioral_contracts_v1_phase_1
* objective: entender intencao inicial sem transformar a conversa em interrogatorio
* max_questions: 1
* max_consecutive_questions: 2
* question_budget_per_stage: 2
* remaining_consecutive_questions: 2
* contextualization_required: true
* must_generate_value_before_more_questions: true
* must_explain_consultive_model: false
* must_request_permission_to_continue: false

Ju:
Legal. Pra investir eu ja olho mais liquidez e aluguel possivel do que beleza do imovel. Voce pensa em renda mensal ou valorizacao?

Runtime Signals:

* question_count: 1
* presentation_due: true
* contextualization_detected: true
* behavioral_contract_applied: true
* tools_called: consultar_imoveis
* property_cards_count: 0

Violacoes Detectadas:

* runtime_violations: none
* expectation_failures: none

Behavioral Analysis:

* pacing: bom
* tamanho resposta: media
* contextualizacao: presente
* warmth: presente
* espontaneidade: boa
* previsibilidade: baixa
* SDR regression: baixa
* fluidez: boa
* friccao: baixa
* corporatives: baixo
* sensacao IA: baixa
* rigidez policy: baixa

# Cenario: Lead Ansioso

Lead:
preciso me mudar urgente

Stage:
SAUDACAO

Runtime State:
lead_novo

Behavioral Contract:

* version: ju_behavioral_contracts_v1_phase_1
* objective: criar confianca, explicar modelo consultivo e obter consentimento contextual
* max_questions: 1
* max_consecutive_questions: 1
* question_budget_per_stage: 1
* remaining_consecutive_questions: 1
* contextualization_required: true
* must_generate_value_before_more_questions: true
* must_explain_consultive_model: true
* must_request_permission_to_continue: true

Ju:
Certo. Se e urgente, melhor ir pelo caminho mais simples. Voce prefere entrar rapido ou segurar uma regiao especifica?

Runtime Signals:

* question_count: 1
* presentation_due: false
* contextualization_detected: true
* behavioral_contract_applied: true
* tools_called: none
* property_cards_count: 0

Violacoes Detectadas:

* runtime_violations: none
* expectation_failures: none

Behavioral Analysis:

* pacing: bom
* tamanho resposta: media
* contextualizacao: presente
* warmth: presente
* espontaneidade: boa
* previsibilidade: baixa
* SDR regression: baixa
* fluidez: boa
* friccao: baixa
* corporatives: baixo
* sensacao IA: baixa
* rigidez policy: baixa

# Cenario: Lead Desconfiado

Lead:
isso e imobiliaria ou corretor?

Stage:
SAUDACAO

Runtime State:
lead_novo

Behavioral Contract:

* version: ju_behavioral_contracts_v1_phase_1
* objective: criar confianca, explicar modelo consultivo e obter consentimento contextual
* max_questions: 1
* max_consecutive_questions: 1
* question_budget_per_stage: 1
* remaining_consecutive_questions: 1
* contextualization_required: true
* must_generate_value_before_more_questions: true
* must_explain_consultive_model: true
* must_request_permission_to_continue: true

Ju:
Entendo. E a Jurema Brokers, uma imobiliaria. Eu te ajudo num caminho mais consultivo, sem te jogar lista pronta. Posso entender rapidinho o que voce quer, pra nao te indicar algo nada a ver?

Runtime Signals:

* question_count: 1
* presentation_due: false
* contextualization_detected: true
* behavioral_contract_applied: true
* tools_called: none
* property_cards_count: 0

Violacoes Detectadas:

* runtime_violations: none
* expectation_failures: none

Behavioral Analysis:

* pacing: bom
* tamanho resposta: longa
* contextualizacao: presente
* warmth: presente
* espontaneidade: boa
* previsibilidade: media
* SDR regression: baixa
* fluidez: boa
* friccao: baixa
* corporatives: baixo
* sensacao IA: baixa
* rigidez policy: baixa

# Cenario: Lead Direto

Lead:
quero apartamento 3 quartos em cabo branco ate 900 mil

Stage:
QUALIFICACAO_MINIMA

Runtime State:
matching

Behavioral Contract:

* version: ju_behavioral_contracts_v1_phase_1
* objective: entender intencao inicial sem transformar a conversa em interrogatorio
* max_questions: 1
* max_consecutive_questions: 2
* question_budget_per_stage: 2
* remaining_consecutive_questions: 2
* contextualization_required: true
* must_generate_value_before_more_questions: true
* must_explain_consultive_model: false
* must_request_permission_to_continue: false

Ju:
Otimo. Cabo Branco, 3 quartos, ate 900 mil. Ja da pra comecar bem dai; vou separar opcoes e ajusto com voce depois.

Runtime Signals:

* question_count: 0
* presentation_due: true
* contextualization_detected: true
* behavioral_contract_applied: true
* tools_called: consultar_imoveis
* property_cards_count: 3

Violacoes Detectadas:

* runtime_violations: none
* expectation_failures: none

Behavioral Analysis:

* pacing: direto
* tamanho resposta: media
* contextualizacao: presente
* warmth: presente
* espontaneidade: boa
* previsibilidade: baixa
* SDR regression: baixa
* fluidez: boa
* friccao: baixa
* corporatives: baixo
* sensacao IA: baixa
* rigidez policy: baixa

# Cenario: Sem Imovel Aderente

Lead:
quero cobertura no bessa ate 500 mil

Stage:
QUALIFICACAO_MINIMA

Runtime State:
matching

Behavioral Contract:

* version: ju_behavioral_contracts_v1_phase_1
* objective: entender intencao inicial sem transformar a conversa em interrogatorio
* max_questions: 1
* max_consecutive_questions: 2
* question_budget_per_stage: 2
* remaining_consecutive_questions: 2
* contextualization_required: true
* must_generate_value_before_more_questions: true
* must_explain_consultive_model: false
* must_request_permission_to_continue: false

Ju:
Sendo bem transparente: hoje eu nao tenho nada que realmente converse com isso. Prefiro te falar agora do que tentar encaixar uma opcao desalinhada so pra continuar.

Runtime Signals:

* question_count: 0
* presentation_due: false
* contextualization_detected: true
* behavioral_contract_applied: true
* tools_called: none
* property_cards_count: 0

Violacoes Detectadas:

* runtime_violations: none
* expectation_failures: none

Behavioral Analysis:

* pacing: direto
* tamanho resposta: longa
* contextualizacao: presente
* warmth: baixa
* espontaneidade: boa
* previsibilidade: media
* SDR regression: baixa
* fluidez: boa
* friccao: baixa
* corporatives: baixo
* sensacao IA: baixa
* rigidez policy: baixa

# Cenario: Inventory Incompativel

Lead:
quero casa com vista mar em cabo branco ate 700 mil

Stage:
QUALIFICACAO_MINIMA

Runtime State:
matching

Behavioral Contract:

* version: ju_behavioral_contracts_v1_phase_1
* objective: entender intencao inicial sem transformar a conversa em interrogatorio
* max_questions: 1
* max_consecutive_questions: 2
* question_budget_per_stage: 2
* remaining_consecutive_questions: 2
* contextualization_required: true
* must_generate_value_before_more_questions: true
* must_explain_consultive_model: false
* must_request_permission_to_continue: false

Ju:
Prefiro ser honesta contigo: com esse recorte, o que tenho hoje nao fica coerente. Melhor pausar aqui do que te empurrar algo que nao faz sentido.

Runtime Signals:

* question_count: 0
* presentation_due: false
* contextualization_detected: true
* behavioral_contract_applied: true
* tools_called: none
* property_cards_count: 0

Violacoes Detectadas:

* runtime_violations: none
* expectation_failures: none

Behavioral Analysis:

* pacing: direto
* tamanho resposta: media
* contextualizacao: presente
* warmth: presente
* espontaneidade: boa
* previsibilidade: baixa
* SDR regression: baixa
* fluidez: boa
* friccao: baixa
* corporatives: baixo
* sensacao IA: baixa
* rigidez policy: baixa

# Cenario: Regiao Indisponivel

Lead:
quero apartamento em ponta de campina

Stage:
QUALIFICACAO_MINIMA

Runtime State:
matching

Behavioral Contract:

* version: ju_behavioral_contracts_v1_phase_1
* objective: entender intencao inicial sem transformar a conversa em interrogatorio
* max_questions: 1
* max_consecutive_questions: 2
* question_budget_per_stage: 2
* remaining_consecutive_questions: 2
* contextualization_required: true
* must_generate_value_before_more_questions: true
* must_explain_consultive_model: false
* must_request_permission_to_continue: false

Ju:
Hoje eu nao tenho algo realmente bom em Ponta de Campina pra te indicar com seguranca. Deixo teu perfil anotado e te chamo quando aparecer algo mais alinhado.

Runtime Signals:

* question_count: 0
* presentation_due: false
* contextualization_detected: true
* behavioral_contract_applied: true
* tools_called: none
* property_cards_count: 0

Violacoes Detectadas:

* runtime_violations: none
* expectation_failures: none

Behavioral Analysis:

* pacing: direto
* tamanho resposta: longa
* contextualizacao: presente
* warmth: baixa
* espontaneidade: boa
* previsibilidade: media
* SDR regression: baixa
* fluidez: boa
* friccao: baixa
* corporatives: baixo
* sensacao IA: baixa
* rigidez policy: baixa

# Cenario: Budget Inviavel

Lead:
quero 3 quartos em cabo branco ate 300 mil

Stage:
QUALIFICACAO_MINIMA

Runtime State:
qualificando

Behavioral Contract:

* version: ju_behavioral_contracts_v1_phase_1
* objective: entender intencao inicial sem transformar a conversa em interrogatorio
* max_questions: 1
* max_consecutive_questions: 2
* question_budget_per_stage: 2
* remaining_consecutive_questions: 2
* contextualization_required: true
* must_generate_value_before_more_questions: true
* must_explain_consultive_model: false
* must_request_permission_to_continue: false

Ju:
Sendo bem transparente, hoje eu nao tenho um match realmente coerente nesse valor em Cabo Branco. Prefiro te preservar de opcao desalinhada.

Runtime Signals:

* question_count: 0
* presentation_due: false
* contextualization_detected: true
* behavioral_contract_applied: true
* tools_called: none
* property_cards_count: 0

Violacoes Detectadas:

* runtime_violations: none
* expectation_failures: none

Behavioral Analysis:

* pacing: direto
* tamanho resposta: media
* contextualizacao: presente
* warmth: baixa
* espontaneidade: boa
* previsibilidade: baixa
* SDR regression: baixa
* fluidez: boa
* friccao: baixa
* corporatives: baixo
* sensacao IA: baixa
* rigidez policy: baixa

# Cenario: Perfil Extremamente Especifico

Lead:
quero cobertura duplex frente mar 4 suites no bessa ate 1 milhao

Stage:
QUALIFICACAO_MINIMA

Runtime State:
matching

Behavioral Contract:

* version: ju_behavioral_contracts_v1_phase_1
* objective: entender intencao inicial sem transformar a conversa em interrogatorio
* max_questions: 1
* max_consecutive_questions: 2
* question_budget_per_stage: 2
* remaining_consecutive_questions: 2
* contextualization_required: true
* must_generate_value_before_more_questions: true
* must_explain_consultive_model: false
* must_request_permission_to_continue: false

Ju:
Esse perfil e bem especifico. Hoje eu nao tenho nada que eu ache realmente coerente pra te apresentar; melhor deixar isso no radar do que forcar um encaixe ruim.

Runtime Signals:

* question_count: 0
* presentation_due: false
* contextualization_detected: true
* behavioral_contract_applied: true
* tools_called: none
* property_cards_count: 0

Violacoes Detectadas:

* runtime_violations: none
* expectation_failures: none

Behavioral Analysis:

* pacing: direto
* tamanho resposta: longa
* contextualizacao: presente
* warmth: baixa
* espontaneidade: boa
* previsibilidade: media
* SDR regression: baixa
* fluidez: boa
* friccao: baixa
* corporatives: baixo
* sensacao IA: baixa
* rigidez policy: baixa

# Cenario: Lead Rejeita Opcoes

Lead:
nenhuma dessas opcoes faz sentido

Stage:
SAUDACAO

Runtime State:
lead_novo

Behavioral Contract:

* version: ju_behavioral_contracts_v1_phase_1
* objective: criar confianca, explicar modelo consultivo e obter consentimento contextual
* max_questions: 1
* max_consecutive_questions: 1
* question_budget_per_stage: 1
* remaining_consecutive_questions: 1
* contextualization_required: true
* must_generate_value_before_more_questions: true
* must_explain_consultive_model: true
* must_request_permission_to_continue: true

Ju:
Sendo bem transparente, isso ajuda bastante. Prefiro ajustar agora do que te fazer perder tempo com algo desalinhado; pelo teu recorte, o caminho parece outro.

Runtime Signals:

* question_count: 0
* presentation_due: false
* contextualization_detected: true
* behavioral_contract_applied: true
* tools_called: none
* property_cards_count: 0

Violacoes Detectadas:

* runtime_violations: none
* expectation_failures: none

Behavioral Analysis:

* pacing: direto
* tamanho resposta: media
* contextualizacao: presente
* warmth: presente
* espontaneidade: boa
* previsibilidade: baixa
* SDR regression: baixa
* fluidez: boa
* friccao: baixa
* corporatives: baixo
* sensacao IA: baixa
* rigidez policy: baixa

