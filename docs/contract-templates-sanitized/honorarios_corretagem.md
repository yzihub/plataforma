---
template_key: honorarios_corretagem
arquivo_original: PAGAMENTO DE HONORÁRIOS.docx
finalidade: Contrato de honorarios de corretagem imobiliaria, com contratante, corretores ou imobiliarias participantes, objeto intermediado, valor do negocio, honorarios, forma de pagamento, divisao, irrevogabilidade, confirmacao da intermediacao, foro e assinaturas.
placeholders_obrigatorios:
  - "{{data_contrato}}"
  - "{{cidade}}"
  - "{{foro}}"
  - "{{contratante_nome}}"
  - "{{contratante_cpf_cnpj}}"
  - "{{contratante_endereco}}"
  - "{{corretor_nome}}"
  - "{{corretor_creci}}"
  - "{{imovel_descricao_juridica}}"
  - "{{valor_negocio}}"
  - "{{valor_negocio_extenso}}"
  - "{{valor_honorarios}}"
  - "{{valor_honorarios_extenso}}"
  - "{{forma_pagamento_honorarios}}"
placeholders_opcionais:
  - "{{imobiliaria_nome}}"
  - "{{imobiliaria_cnpj}}"
  - "{{imobiliaria_creci}}"
  - "{{imobiliaria_endereco}}"
  - "{{contratante_representante}}"
  - "{{contratante_cpf_cnpj}}"
  - "{{imovel_endereco_completo}}"
  - "{{imovel_matricula}}"
  - "{{imovel_cartorio}}"
  - "{{imovel_area_terreno}}"
  - "{{imovel_medidas_confrontacoes}}"
  - "{{imovel_inscricao_municipal}}"
  - "{{imovel_observacoes_contratuais}}"
  - "{{corretores_participantes}}"
  - "{{percentual_honorarios}}"
  - "{{divisao_honorarios}}"
  - "{{dados_bancarios_honorarios}}"
  - "{{parcelas_honorarios}}"
placeholders_opcionais_assinaturas:
  - "{{testemunha_1_nome}}"
  - "{{testemunha_1_cpf}}"
  - "{{testemunha_2_nome}}"
  - "{{testemunha_2_cpf}}"
blocos_dinamicos_usados:
  - "{{corretores_participantes}}"
  - "{{parcelas_honorarios}}"
  - "{{dados_bancarios}}"
  - "{{observacoes_especificas}}"
pendente_template_file_id: true
---

# CONTRATO DE HONORARIOS DE CORRETAGEM IMOBILIARIA

**Contratante:** {{contratante_nome}}, inscrito(a) no CPF/CNPJ sob o nº {{contratante_cpf_cnpj}}, com endereco em {{contratante_endereco}}, neste ato representado(a), quando aplicavel, por {{contratante_representante}}.

**Corretor ou imobiliaria principal:** {{imobiliaria_nome}}, CNPJ {{imobiliaria_cnpj}}, CRECI {{imobiliaria_creci}}, com endereco em {{imobiliaria_endereco}}, por seu corretor responsavel {{corretor_nome}}, CRECI {{corretor_creci}}.

**Corretores participantes:**  
{{corretores_participantes}}

As partes acima qualificadas resolvem celebrar o presente CONTRATO DE HONORARIOS DE CORRETAGEM, que sera regido pelas clausulas e condicoes abaixo.

## CLAUSULA 1 - DO OBJETO

1.1. O presente contrato tem por objeto o pagamento de honorarios de corretagem em razao da intermediacao imobiliaria realizada sobre o seguinte imovel ou negocio:

{{imovel_descricao_juridica}}

1.2. Dados complementares do objeto intermediado:

- Endereco: {{imovel_endereco_completo}}
- Matricula: {{imovel_matricula}}
- Cartorio: {{imovel_cartorio}}
- Area do terreno: {{imovel_area_terreno}}
- Medidas e confrontacoes: {{imovel_medidas_confrontacoes}}
- Inscricao municipal: {{imovel_inscricao_municipal}}
- Observacoes contratuais: {{imovel_observacoes_contratuais}}

## CLAUSULA 2 - DO VALOR DA VENDA OU DO NEGOCIO

2.1. O imovel ou negocio objeto da intermediacao foi negociado pelo valor de {{valor_negocio}} ({{valor_negocio_extenso}}), observadas as condicoes comerciais pactuadas entre as partes envolvidas.

2.2. Quando o negocio envolver permuta, permuta financeira, unidades imobiliarias, participacao percentual ou outra composicao economica, as condicoes especificas deverao constar no bloco de observacoes especificas.

{{observacoes_especificas}}

## CLAUSULA 3 - DOS HONORARIOS DE CORRETAGEM

3.1. Pelos servicos de intermediacao imobiliaria prestados pelos CORRETORES e/ou IMOBILIARIAS, a CONTRATANTE pagara honorarios de corretagem no valor de {{valor_honorarios}} ({{valor_honorarios_extenso}}).

3.2. Quando pactuado em percentual, os honorarios corresponderao a {{percentual_honorarios}} sobre o valor do negocio ou sobre a base de calculo indicada pelas partes.

3.3. O pagamento dos honorarios sera realizado conforme a seguinte composicao:

{{forma_pagamento_honorarios}}

{{parcelas_honorarios}}

## CLAUSULA 4 - DA FORMA DE PAGAMENTO E DIVISAO

4.1. Os honorarios de corretagem serao pagos individualmente a cada CORRETOR e/ou IMOBILIARIA participante, conforme a divisao acordada entre as partes:

{{divisao_honorarios}}

4.2. Os dados bancarios ou chaves de pagamento para quitacao dos honorarios deverao constar abaixo:

{{dados_bancarios_honorarios}}

{{dados_bancarios}}

4.3. Os comprovantes de deposito, transferencia, PIX, boleto ou outro meio de pagamento servirao como recibo de pagamento, sem prejuizo da emissao de recibo formal quando solicitado.

## CLAUSULA 5 - DA IRREVOGABILIDADE DOS HONORARIOS

5.1. Uma vez concretizado o negocio juridico entre as partes apresentadas pelo CORRETOR e/ou IMOBILIARIA, os honorarios de corretagem serao devidos integralmente, independentemente de posterior desistência, distrato ou inadimplemento entre comprador e vendedor, conforme previsto nos artigos 722 a 729 do Codigo Civil Brasileiro.

5.2. A obrigacao de pagamento dos honorarios subsistira ainda que a formalizacao definitiva do negocio ocorra por instrumento posterior, escritura, contrato complementar ou outro documento equivalente, desde que decorrente da intermediacao realizada.

## CLAUSULA 6 - DA CONFIRMACAO DA INTERMEDIACAO

6.1. A CONTRATANTE reconhece que o negocio objeto deste contrato ocorreu em decorrencia direta da intermediacao realizada pelo CORRETOR e/ou IMOBILIARIA, fazendo jus ao recebimento dos honorarios de corretagem estipulados.

6.2. A responsabilidade dos corretores e imobiliarias limita-se a intermediacao do negocio, nao abrangendo obrigacoes assumidas pelas partes compradora, vendedora, permutante, construtora, incorporadora ou contratante, salvo previsao expressa em contrario.

## CLAUSULA 7 - DO FORO

7.1. Para dirimir quaisquer duvidas oriundas deste contrato, as partes elegem o foro de {{foro}}, com renuncia a qualquer outro, por mais privilegiado que seja.

{{cidade}}, {{data_contrato}}.

## ASSINATURAS

________________________________________  
{{contratante_nome}}  
Contratante

________________________________________  
{{imobiliaria_nome}}  
Imobiliaria

________________________________________  
{{corretor_nome}}  
Corretor responsavel

________________________________________  
{{testemunha_1_nome}}  
CPF: {{testemunha_1_cpf}}

________________________________________  
{{testemunha_2_nome}}  
CPF: {{testemunha_2_cpf}}
