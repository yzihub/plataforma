---
template_key: compra_venda_casa
arquivo_original: COMPRA E VENDA CASA.docx
finalidade: Contrato particular de compromisso de compra e venda de casa, com qualificacao das partes, objeto, matricula, areas, preco, forma de pagamento, entrega das chaves, vistoria, documentacao, penalidades, foro e assinaturas.
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
  - "{{imovel_endereco_completo}}"
  - "{{imovel_matricula}}"
  - "{{imovel_cartorio}}"
  - "{{valor_total}}"
  - "{{valor_total_extenso}}"
  - "{{forma_pagamento}}"
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
  - "{{imovel_area_construida}}"
  - "{{imovel_area_terreno}}"
  - "{{imovel_medidas_confrontacoes}}"
  - "{{imovel_observacoes_contratuais}}"
  - "{{entrada_valor}}"
  - "{{entrada_valor_extenso}}"
  - "{{saldo_valor}}"
  - "{{saldo_valor_extenso}}"
  - "{{prazo_quitacao}}"
  - "{{dados_bancarios_vendedor}}"
  - "{{multa_rescisoria}}"
placeholders_opcionais_assinaturas:
  - "{{testemunha_1_nome}}"
  - "{{testemunha_1_cpf}}"
  - "{{testemunha_2_nome}}"
  - "{{testemunha_2_cpf}}"
blocos_dinamicos_usados:
  - "{{forma_pagamento}}"
  - "{{parcelas_pagamento}}"
  - "{{bens_inclusos}}"
  - "{{dados_bancarios}}"
  - "{{observacoes_especificas}}"
pendente_template_file_id: true
---

# CONTRATO PARTICULAR DE COMPROMISSO DE COMPRA E VENDA DE IMOVEL

**Promitente vendedor:** {{vendedor_nome}}, {{vendedor_estado_civil}}, {{vendedor_profissao}}, inscrito(a) no CPF/CNPJ sob o nº {{vendedor_cpf_cnpj}}, RG/inscricao nº {{vendedor_rg}}, e-mail {{vendedor_email}}, residente e domiciliado(a) em {{vendedor_endereco}}, neste ato representado(a), quando aplicavel, por {{vendedor_representante}}.

**Promissario comprador:** {{comprador_nome}}, {{comprador_estado_civil}}, {{comprador_profissao}}, inscrito(a) no CPF/CNPJ sob o nº {{comprador_cpf_cnpj}}, RG/inscricao nº {{comprador_rg}}, e-mail {{comprador_email}}, residente e domiciliado(a) em {{comprador_endereco}}, neste ato representado(a), quando aplicavel, por {{comprador_representante}}.

As partes acima identificadas tem, entre si, justo e acertado, o presente Contrato de Promessa de Compra e Venda de Imovel, que se regera pelas clausulas seguintes e pelas condicoes descritas neste instrumento.

## CLAUSULA PRIMEIRA - OBJETO

O presente contrato tem por objeto a compra e venda do imovel situado em {{imovel_endereco_completo}}, matriculado sob o nº {{imovel_matricula}} no {{imovel_cartorio}}, com a seguinte descricao juridica:

{{imovel_descricao_juridica}}

Areas e caracteristicas contratuais do imovel:

- Area construida: {{imovel_area_construida}}
- Area de terreno: {{imovel_area_terreno}}
- Medidas e confrontacoes: {{imovel_medidas_confrontacoes}}
- Observacoes: {{imovel_observacoes_contratuais}}

## CLAUSULA SEGUNDA - CIENCIA DO COMPRADOR

O PROMISSARIO COMPRADOR declara ter percorrido e vistoriado o imovel prometido a venda, objeto do presente contrato, estando ciente de suas caracteristicas, estado de conservacao, medidas, tamanho, localizacao e demais condicoes aparentes.

## CLAUSULA TERCEIRA - PROPRIEDADE E ONUS

O PROMITENTE VENDEDOR declara, para os devidos fins de direito, que e legitimo proprietario do imovel objeto deste contrato e que o referido imovel se encontra livre e desembaracado de onus, inclusive penhora, hipoteca, restricoes, dividas ou impedimentos, salvo aqueles expressamente informados neste instrumento.

## CLAUSULA QUARTA - ENTREGA LIVRE E DESEMBARACADA

O PROMITENTE VENDEDOR compromete-se a entregar o imovel descrito na clausula primeira, bem como os bens nele inseridos e indicados neste contrato, livres e desembaracados, sem onus, dividas de energia, agua, IPTU, TCR, GRPU/SPU, condominio, taxas extras, arrestos, sequestros ou restricoes de qualquer natureza, assumindo os encargos anteriores a transacao e danos de sua responsabilidade.

{{bens_inclusos}}

## CLAUSULA QUINTA - VALOR

Pelo presente instrumento, o valor total da transacao e de {{valor_total}} ({{valor_total_extenso}}).

O PROMITENTE VENDEDOR promete vender ao PROMISSARIO COMPRADOR, e este promete comprar, o imovel objeto do presente contrato pelo preco certo e previamente ajustado indicado nesta clausula.

## CLAUSULA SEXTA - FORMA DE PAGAMENTO E ENTREGA DAS CHAVES

Fica acertado entre as partes que o pagamento sera realizado da seguinte forma:

{{forma_pagamento}}

{{parcelas_pagamento}}

Quando houver pagamento por transferencia bancaria, deposito, PIX ou outro meio indicado, os dados deverao constar abaixo:

{{dados_bancarios}}

A entrega das chaves e a posse direta do imovel ocorrerao conforme as condicoes de pagamento e quitacao previstas neste contrato, condicionadas a confirmacao do recebimento integral dos valores devidos pelo VENDEDOR, salvo estipulacao diversa no bloco de observacoes especificas.

## CLAUSULA SETIMA - CORRETAGEM

A responsabilidade da corretagem limita-se a intermediacao da negociacao de compra e venda do imovel descrito na clausula primeira, excluindo de si todas e quaisquer obrigacoes assumidas pelas partes.

O pagamento correspondente a corretagem, quando devido, sera realizado em favor de {{imobiliaria_nome}}, CNPJ {{imobiliaria_cnpj}}, CRECI {{imobiliaria_creci}}, e/ou do corretor {{corretor_nome}}, CRECI {{corretor_creci}}, conforme convencionado entre as partes.

## CLAUSULA OITAVA - ENTREGA DO IMOVEL

Apos o pagamento da parcela final ou no ato definido pelas partes, o PROMITENTE VENDEDOR desocupara o imovel, oportunidade em que as partes farao vistoria integral e entrega das chaves ao PROMISSARIO COMPRADOR.

Paragrafo primeiro. Apos a entrega das chaves, o PROMISSARIO COMPRADOR ficara com a posse, dominio, direito, uso e gozo do imovel objeto deste contrato, podendo dele dispor nos limites legais e contratuais.

Paragrafo segundo. A partir da imissao na posse, correrao por conta unica e exclusiva do PROMISSARIO COMPRADOR todas as taxas, impostos, emolumentos, custas e demais despesas que incidam ou venham a incidir sobre o imovel, ainda que lancadas em nome do PROMITENTE VENDEDOR.

Paragrafo terceiro. Havendo divergencia no momento da vistoria, a posse nao sera impedida quando o valor contratual tiver sido efetivamente quitado, sem prejuizo da apuracao das responsabilidades cabiveis.

## CLAUSULA NONA - IRREVOGABILIDADE E IRRETRATABILIDADE

Todos os compromissos assumidos neste contrato sao de carater irrevogavel e irretratavel, obrigando as partes, seus herdeiros e sucessores a cumprirem o aqui estabelecido.

## CLAUSULA DECIMA - DESISTENCIA E INADIMPLEMENTO

O nao cumprimento de qualquer obrigacao constante deste contrato implicara a rescisao do instrumento, independentemente de aviso, notificacao ou interpelacao judicial ou extrajudicial, obrigando-se a parte infratora ao pagamento da pena convencional de {{multa_rescisoria}}, alem das custas, despesas e honorarios advocaticios necessarios a garantia dos direitos da parte inocente.

## CLAUSULA DECIMA PRIMEIRA - FALECIMENTO

Em caso de falecimento do PROMITENTE VENDEDOR, fica acordado que seus herdeiros honrarao o presente contrato, observadas as exigencias legais aplicaveis para transferencia do bem ao COMPRADOR.

## CLAUSULA DECIMA SEGUNDA - DOCUMENTACAO

O PROMITENTE VENDEDOR obriga-se a apresentar toda a documentacao necessaria, inclusive certidoes negativas pessoais e do imovel, sem encargo ou responsabilidade para o PROMISSARIO COMPRADOR, salvo disposicao diversa.

O PROMISSARIO COMPRADOR compromete-se a encaminhar toda a documentacao exigida pelo cartorio de registro de imoveis para transferencia da titularidade do bem.

## CLAUSULA DECIMA TERCEIRA - IMPEDIMENTOS

Caso exista qualquer impedimento acerca da transferencia do imovel, fica o PROMITENTE VENDEDOR obrigado a sanar o impedimento as suas proprias expensas, salvo se decorrente de culpa do PROMISSARIO COMPRADOR.

## CLAUSULA DECIMA QUARTA - FORNECIMENTO DE DOCUMENTOS

Fica o PROMITENTE VENDEDOR obrigado a fornecer toda e qualquer documentacao relativa ao bem, de modo a facilitar a transferencia da titularidade junto ao cartorio de registro de imoveis.

## CLAUSULA DECIMA QUINTA - FORO

O foro deste contrato e o da comarca de {{foro}}, renunciando as partes a qualquer outro, por mais privilegiado que seja.

{{observacoes_especificas}}

As partes contratantes, apos terem conhecimento previo do texto deste contrato e compreendido seu sentido e alcance, por estarem justas e livremente contratadas, aceitam as condicoes estipuladas e firmam o presente em vias de igual forma e teor, na presenca das testemunhas abaixo, para os fins e efeitos de direito.

{{cidade}}, {{data_contrato}}.

## ASSINATURAS

________________________________________  
{{vendedor_nome}}  
Promitente vendedor

________________________________________  
{{comprador_nome}}  
Promissario comprador

________________________________________  
{{testemunha_1_nome}}  
CPF: {{testemunha_1_cpf}}

________________________________________  
{{testemunha_2_nome}}  
CPF: {{testemunha_2_cpf}}
