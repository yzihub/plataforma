---
template_key: compra_venda_permuta
arquivo_original: COMPRA E VENDA C PERMUTA.docx
finalidade: Contrato particular de compra e venda de imovel com permuta, envolvendo imovel principal, bens ou unidades dados como sinal ou parte do pagamento, saldo em dinheiro, posse, despesas, honorarios, foro e assinaturas.
placeholders_obrigatorios:
  - "{{data_contrato}}"
  - "{{cidade}}"
  - "{{foro}}"
  - "{{vendedor_nome}}"
  - "{{vendedor_cpf_cnpj}}"
  - "{{vendedor_endereco}}"
  - "{{comprador_nome}}"
  - "{{comprador_cpf_cnpj}}"
  - "{{comprador_endereco}}"
  - "{{imovel_descricao_juridica}}"
  - "{{valor_total}}"
  - "{{valor_total_extenso}}"
  - "{{forma_pagamento}}"
  - "{{bens_permutados}}"
  - "{{valor_bens_permutados}}"
placeholders_opcionais:
  - "{{imobiliaria_nome}}"
  - "{{imobiliaria_cnpj}}"
  - "{{imobiliaria_creci}}"
  - "{{corretor_nome}}"
  - "{{corretor_creci}}"
  - "{{vendedor_rg}}"
  - "{{vendedor_estado_civil}}"
  - "{{vendedor_profissao}}"
  - "{{vendedor_email}}"
  - "{{vendedor_representante}}"
  - "{{comprador_rg}}"
  - "{{comprador_estado_civil}}"
  - "{{comprador_profissao}}"
  - "{{comprador_email}}"
  - "{{comprador_representante}}"
  - "{{imovel_endereco_completo}}"
  - "{{imovel_matricula}}"
  - "{{imovel_cartorio}}"
  - "{{imovel_area_construida}}"
  - "{{imovel_area_terreno}}"
  - "{{imovel_medidas_confrontacoes}}"
  - "{{imovel_observacoes_contratuais}}"
  - "{{saldo_em_dinheiro}}"
  - "{{parcelas_pagamento}}"
  - "{{dados_bancarios_vendedor}}"
placeholders_opcionais_assinaturas:
  - "{{testemunha_1_nome}}"
  - "{{testemunha_1_cpf}}"
  - "{{testemunha_2_nome}}"
  - "{{testemunha_2_cpf}}"
blocos_dinamicos_usados:
  - "{{forma_pagamento}}"
  - "{{bens_permutados}}"
  - "{{parcelas_pagamento}}"
  - "{{dados_bancarios}}"
  - "{{observacoes_especificas}}"
pendente_template_file_id: true
---

# CONTRATO PARTICULAR DE COMPRA E VENDA DE IMOVEL

Pelo presente instrumento particular de promessa de compra e venda, comparecem como partes:

**Vendedor:** {{vendedor_nome}}, {{vendedor_estado_civil}}, {{vendedor_profissao}}, inscrito(a) no CPF/CNPJ sob o nº {{vendedor_cpf_cnpj}}, RG/inscricao nº {{vendedor_rg}}, e-mail {{vendedor_email}}, com endereco em {{vendedor_endereco}}, neste ato representado(a), quando aplicavel, por {{vendedor_representante}}.

**Comprador:** {{comprador_nome}}, {{comprador_estado_civil}}, {{comprador_profissao}}, inscrito(a) no CPF/CNPJ sob o nº {{comprador_cpf_cnpj}}, RG/inscricao nº {{comprador_rg}}, e-mail {{comprador_email}}, com endereco em {{comprador_endereco}}, neste ato representado(a), quando aplicavel, por {{comprador_representante}}.

As partes acima qualificadas vem entre si, justo e plenamente acertadas, celebrar a presente compra e venda com permuta, mediante as estipulacoes, clausulas e condicoes seguintes, mutua e reciprocamente avençadas, aceitas e outorgadas.

## PRIMEIRA - DO IMOVEL

O imovel objeto da presente compra e venda e assim descrito:

{{imovel_descricao_juridica}}

Endereco: {{imovel_endereco_completo}}

Matricula: {{imovel_matricula}}

Cartorio: {{imovel_cartorio}}

Areas, medidas e confrontacoes: {{imovel_area_construida}}; {{imovel_area_terreno}}; {{imovel_medidas_confrontacoes}}

Observacoes contratuais: {{imovel_observacoes_contratuais}}

## SEGUNDA - DA PROMESSA DE VENDA

Pelo presente instrumento particular de promessa de compra e venda, os VENDEDORES comprometem-se e obrigam-se a vender ao COMPRADOR os direitos sobre a aquisicao definitiva do imovel acima descrito e caracterizado, nas condicoes de pagamento descritas neste instrumento.

## TERCEIRA - DO PRECO E DA FORMA DE PAGAMENTO

O preco certo e ajustado pela venda ora contratada e de {{valor_total}} ({{valor_total_extenso}}), que sera pago da forma abaixo descrita:

{{forma_pagamento}}

**Bens dados em permuta:**  
{{bens_permutados}}

**Valor atribuido aos bens permutados:** {{valor_bens_permutados}}

**Saldo em dinheiro:** {{saldo_em_dinheiro}}

{{parcelas_pagamento}}

Quando houver repasse, aluguel, ocupacao, posse temporaria, prazo de entrega dos bens permutados ou condicao especial vinculada a permuta, as condicoes deverao constar no bloco de observacoes especificas.

{{dados_bancarios}}

## QUARTA - DA QUITACAO, POSSE E ENTREGA

A quitacao do preco e a entrega da posse do imovel principal e dos bens permutados ocorrerao conforme as condicoes de pagamento, prazos e observacoes especificas definidas pelas partes.

Caso algum dos bens permutados esteja locado, ocupado ou sujeito a contrato vigente, as partes deverao respeitar as condicoes descritas no bloco de observacoes especificas, inclusive quanto a repasse de aluguel, notificacao de locatarios e prazo de desocupacao.

{{observacoes_especificas}}

## QUINTA - DECLARACOES SOBRE ONUS E ENCARGOS

Os VENDEDORES e o COMPRADOR declaram que nao existem averbacoes, impedimentos judiciais, onus reais ou fiscais sobre os imoveis e bens objeto desta operacao, salvo aqueles expressamente indicados neste contrato.

As partes garantem que taxas, IPTU, TCR, energia, agua, condominio e demais encargos estarao devidamente quitados ate a entrega das chaves ou ate o marco de responsabilidade definido neste contrato, cabendo a cada parte assumir os encargos a partir da posse definitiva do respectivo bem.

## SEXTA - ESCRITURA, ITBI E DESPESAS

O COMPRADOR e os VENDEDORES, apos a quitacao do preco e cumprimento das condicoes de permuta, serao responsaveis pelas despesas com escritura, ITBI, emolumentos, taxas, registros e custas pertinentes a cada imovel ou bem a que cada parte tera direito, salvo disposicao expressa diversa.

## SETIMA - IRREVOGABILIDADE E SUCESSAO

O presente contrato obriga as partes, seus herdeiros e sucessores, sendo celebrado em carater irrevogavel e irretratavel, ressalvado o inadimplemento ou descumprimento das obrigacoes contratadas.

## OITAVA - FORO

O foro do presente contrato e o de {{foro}}, com exclusao de qualquer outro, por mais privilegiado que seja.

## NONA - HONORARIOS DE INTERMEDIACAO

Os VENDEDORES e/ou o COMPRADOR comprometem-se a efetuar o pagamento dos honorarios pela intermediacao ora realizada, conforme valores, percentuais, divisao, vencimentos e dados de pagamento ajustados entre as partes.

Imobiliaria: {{imobiliaria_nome}}, CNPJ {{imobiliaria_cnpj}}, CRECI {{imobiliaria_creci}}.

Corretor responsavel: {{corretor_nome}}, CRECI {{corretor_creci}}.

## DECIMA - DISPOSICOES FINAIS

E assim, apos lerem e acharem o presente instrumento adequado a fiel expressao de suas vontades, os VENDEDORES e o COMPRADOR firmam o presente contrato em vias de igual teor e forma, para um so e mesmo efeito de direito, diante das testemunhas abaixo.

{{cidade}}, {{data_contrato}}.

## ASSINATURAS

________________________________________  
{{vendedor_nome}}  
Vendedor

________________________________________  
{{comprador_nome}}  
Comprador

________________________________________  
{{testemunha_1_nome}}  
CPF: {{testemunha_1_cpf}}

________________________________________  
{{testemunha_2_nome}}  
CPF: {{testemunha_2_cpf}}
