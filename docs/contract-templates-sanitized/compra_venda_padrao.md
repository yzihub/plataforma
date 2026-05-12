---
template_key: compra_venda_padrao
arquivo_original: COMPRA E VENDA PADRAO.docx
finalidade: Contrato de compromisso de venda e compra de imovel, com quadro resumo, qualificacao das partes, objeto, preco, forma de pagamento, posse, despesas, corretagem, foro e assinaturas.
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
placeholders_opcionais:
  - "{{imobiliaria_nome}}"
  - "{{imobiliaria_cnpj}}"
  - "{{imobiliaria_creci}}"
  - "{{imobiliaria_endereco}}"
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
  - "{{imovel_titulo_comercial}}"
  - "{{imovel_endereco_completo}}"
  - "{{imovel_matricula}}"
  - "{{imovel_cartorio}}"
  - "{{imovel_area_privativa}}"
  - "{{imovel_observacoes_contratuais}}"
  - "{{entrada_valor}}"
  - "{{entrada_valor_extenso}}"
  - "{{saldo_valor}}"
  - "{{saldo_valor_extenso}}"
  - "{{prazo_quitacao}}"
  - "{{dados_bancarios_vendedor}}"
placeholders_opcionais_assinaturas:
  - "{{testemunha_1_nome}}"
  - "{{testemunha_1_cpf}}"
  - "{{testemunha_2_nome}}"
  - "{{testemunha_2_cpf}}"
blocos_dinamicos_usados:
  - "{{forma_pagamento}}"
  - "{{parcelas_pagamento}}"
  - "{{bens_inclusos}}"
  - "{{bens_excluidos}}"
  - "{{dados_bancarios}}"
  - "{{observacoes_especificas}}"
pendente_template_file_id: true
---

# CONTRATO DE COMPROMISSO DE VENDA E COMPRA DE IMOVEL

## QUADRO RESUMO

**Data:** {{data_contrato}}

**Cidade:** {{cidade}}

**Promitente vendedor:** {{vendedor_nome}}, {{vendedor_estado_civil}}, {{vendedor_profissao}}, inscrito(a) no CPF/CNPJ sob o nº {{vendedor_cpf_cnpj}}, RG/inscricao nº {{vendedor_rg}}, e-mail {{vendedor_email}}, com endereco em {{vendedor_endereco}}, neste ato representado(a), quando aplicavel, por {{vendedor_representante}}.

**Promitente comprador:** {{comprador_nome}}, {{comprador_estado_civil}}, {{comprador_profissao}}, inscrito(a) no CPF/CNPJ sob o nº {{comprador_cpf_cnpj}}, RG/inscricao nº {{comprador_rg}}, e-mail {{comprador_email}}, com endereco em {{comprador_endereco}}, neste ato representado(a), quando aplicavel, por {{comprador_representante}}.

**Imovel:** {{imovel_descricao_juridica}}

**Referencia comercial:** {{imovel_titulo_comercial}}

**Endereco do imovel:** {{imovel_endereco_completo}}

**Matricula e cartorio:** matricula {{imovel_matricula}}, do {{imovel_cartorio}}.

**Preco:** O imovel e vendido pelo preco de {{valor_total}} ({{valor_total_extenso}}).

**Forma de pagamento:** {{forma_pagamento}}

{{parcelas_pagamento}}

**Bens inclusos:** {{bens_inclusos}}

**Bens excluidos:** {{bens_excluidos}}

**Observacoes contratuais:** {{imovel_observacoes_contratuais}}

Por este instrumento particular de venda e compra, as partes qualificadas no quadro resumo acima tem entre si justo e contratado o compromisso de venda e compra do imovel descrito, mediante as clausulas e condicoes a seguir especificadas.

## 1 - OBJETO

1.1. O VENDEDOR declara ser legitimo possuidor e proprietario do imovel descrito e caracterizado no quadro resumo, de forma livre e desembaracada de quaisquer onus reais, pessoais, fiscais ou extrajudiciais, dividas, arrestos, sequestros ou restricoes de qualquer natureza, salvo as ressalvas expressamente indicadas neste instrumento.

1.2. Pelo presente instrumento e na melhor forma de direito, o VENDEDOR promete vender ao COMPRADOR, e este promete comprar, o imovel descrito no quadro resumo, em conformidade com as clausulas e condicoes adiante estabelecidas.

1.3. Quando aplicavel, o imovel sera adquirido com os bens, moveis e utensilios descritos no bloco de bens inclusos, ressalvados os bens expressamente excluidos.

## 2 - PRECO

2.1. O preco certo e ajustado da venda ora prometida e aquele discriminado no quadro resumo, a ser pago pelo COMPRADOR ao VENDEDOR de acordo com as condicoes nele estabelecidas.

2.2. A forma de pagamento, incluindo entrada, saldo, prazos, parcelas, financiamento, transferencias, comprovantes e demais condicoes financeiras, sera aquela indicada no bloco proprio deste contrato.

2.3. Quando houver pagamento por deposito, transferencia bancaria, PIX ou outro meio indicado pelas partes, os dados bancarios deverao constar no bloco abaixo, sem prejuizo da necessidade de comprovacao do pagamento.

{{dados_bancarios}}

## 3 - INADIMPLEMENTO

3.1. A falta de qualquer dos pagamentos estipulados neste contrato autorizara o VENDEDOR, a sua escolha, a considerar rescindido este contrato, sem prejuizo das multas, perdas, danos e demais penalidades previstas neste instrumento.

3.2. O atraso no pagamento de quaisquer valores devidos pelo COMPRADOR sujeitara a parte inadimplente as consequencias pactuadas entre as partes, inclusive clausula penal compensatoria, quando aplicavel.

3.3. A tolerancia de uma parte quanto ao descumprimento de qualquer obrigacao pela outra nao importara novacao, renuncia ou alteracao das condicoes contratadas.

## 4 - POSSE

4.1. A posse do imovel objeto deste contrato sera transmitida ao COMPRADOR conforme a condicao indicada no quadro resumo e nas observacoes especificas.

4.2. Ate a quitacao integral do preco, quando assim previsto, o COMPRADOR nao podera alterar, alienar, ceder, prometer vender ou onerar o imovel sem anuencia expressa do VENDEDOR.

4.3. Caso haja mora ou rescisao, a posse eventualmente transmitida devera ser restituida, observadas as responsabilidades por danos, despesas e encargos vencidos.

## 5 - ESCRITURA, REGISTRO E DESPESAS

5.1. As despesas com escritura, ITBI, custas, emolumentos, certidoes, registros e demais atos necessarios a transferencia do imovel serao suportadas pela parte indicada nas condicoes especificas ou, na ausencia de disposicao diversa, pelo COMPRADOR.

5.2. O VENDEDOR obriga-se a fornecer a documentacao necessaria a formalizacao da escritura definitiva, desde que integralmente cumpridas pelo COMPRADOR as obrigacoes assumidas neste instrumento.

## 6 - IMPOSTOS, TAXAS E ENCARGOS

6.1. A partir da data de imissao na posse ou de outro marco indicado nas observacoes especificas, correrao por conta exclusiva do COMPRADOR todos os impostos, taxas, contribuicoes, despesas condominiais, consumos de agua, energia e demais encargos incidentes sobre o imovel.

6.2. Os encargos anteriores ao marco definido neste contrato permanecerao sob responsabilidade da parte a quem competirem conforme as condicoes pactuadas.

## 7 - IRREVOGABILIDADE E IRRETRATABILIDADE

7.1. O presente contrato e celebrado em carater irrevogavel e irretratavel, ressalvado o inadimplemento das obrigacoes assumidas ou o descumprimento das condicoes aqui impostas.

7.2. As partes obrigam-se por si, seus herdeiros e sucessores, a bem e fielmente cumprir o presente instrumento.

## 8 - INTERMEDIACAO IMOBILIARIA

8.1. Por forca dos artigos 722 a 729 da Lei nº 10.406/2002, a responsabilidade da imobiliaria {{imobiliaria_nome}}, CNPJ {{imobiliaria_cnpj}}, CRECI {{imobiliaria_creci}}, e do corretor {{corretor_nome}}, CRECI {{corretor_creci}}, limita-se a mediacao da presente transacao, excluindo de si as obrigacoes assumidas pelas partes contratantes.

8.2. Os honorarios pela intermediacao imobiliaria serao devidos conforme pactuado entre as partes, em instrumento proprio ou nas observacoes especificas abaixo.

{{observacoes_especificas}}

## 9 - FORO E DISPOSICOES FINAIS

9.1. Para dirimir quaisquer questoes que direta ou indiretamente surgirem deste contrato, as partes elegem o foro de {{foro}}, com renuncia expressa a qualquer outro, por mais privilegiado que seja.

9.2. Todas as notificacoes e comunicacoes decorrentes deste contrato serao feitas com base nos enderecos indicados no quadro resumo, presumindo-se validas caso a parte nao comunique alteracao de domicilio.

9.3. As partes declaram aceitar o presente contrato nos expressos termos em que foi lavrado.

{{cidade}}, {{data_contrato}}.

## ASSINATURAS

________________________________________  
{{vendedor_nome}}  
Vendedor

________________________________________  
{{comprador_nome}}  
Comprador

________________________________________  
{{imobiliaria_nome}}  
Intermediadora

________________________________________  
{{testemunha_1_nome}}  
CPF: {{testemunha_1_cpf}}

________________________________________  
{{testemunha_2_nome}}  
CPF: {{testemunha_2_cpf}}
