---
template_key: locacao_residencial
arquivo_original: LOCAÇÃO.docx
finalidade: Contrato particular de locacao de imovel para fins residenciais, com qualificacao de locador e locatario, objeto, prazo, aluguel, reajuste, pagamento, encargos, conservacao, devolucao, multas, garantias, sinistros, sucessao, foro e assinaturas.
placeholders_obrigatorios:
  - "{{data_contrato}}"
  - "{{cidade}}"
  - "{{foro}}"
  - "{{locador_nome}}"
  - "{{locador_cpf_cnpj}}"
  - "{{locador_endereco}}"
  - "{{locatario_nome}}"
  - "{{locatario_cpf_cnpj}}"
  - "{{locatario_endereco}}"
  - "{{imovel_descricao_juridica}}"
  - "{{imovel_endereco_completo}}"
  - "{{finalidade_locacao}}"
  - "{{prazo_meses}}"
  - "{{data_inicio}}"
  - "{{data_fim}}"
  - "{{valor_aluguel}}"
  - "{{valor_aluguel_extenso}}"
  - "{{dia_vencimento}}"
  - "{{indice_reajuste}}"
placeholders_opcionais:
  - "{{imobiliaria_nome}}"
  - "{{imobiliaria_cnpj}}"
  - "{{imobiliaria_creci}}"
  - "{{corretor_nome}}"
  - "{{corretor_creci}}"
  - "{{locador_rg}}"
  - "{{locador_estado_civil}}"
  - "{{locador_profissao}}"
  - "{{locatario_rg}}"
  - "{{locatario_estado_civil}}"
  - "{{locatario_profissao}}"
  - "{{imovel_matricula}}"
  - "{{imovel_cartorio}}"
  - "{{imovel_area_privativa}}"
  - "{{imovel_observacoes_contratuais}}"
  - "{{garantia_tipo}}"
  - "{{caucao_valor}}"
  - "{{caucao_valor_extenso}}"
  - "{{multa_rescisoria}}"
  - "{{encargos_locatario}}"
placeholders_opcionais_assinaturas:
  - "{{testemunha_1_nome}}"
  - "{{testemunha_1_cpf}}"
  - "{{testemunha_2_nome}}"
  - "{{testemunha_2_cpf}}"
blocos_dinamicos_usados:
  - "{{parcelas_pagamento}}"
  - "{{dados_bancarios}}"
  - "{{observacoes_especificas}}"
pendente_template_file_id: true
---

# INSTRUMENTO PARTICULAR DE LOCACAO DE BEM IMOVEL PARA FINS RESIDENCIAIS

Pelo presente instrumento particular de contrato de locacao de imovel para fins residenciais, e na melhor forma de direito, as partes abaixo qualificadas:

**Locador:** {{locador_nome}}, {{locador_estado_civil}}, {{locador_profissao}}, inscrito(a) no CPF/CNPJ sob o nº {{locador_cpf_cnpj}}, RG/inscricao nº {{locador_rg}}, residente e domiciliado(a) em {{locador_endereco}}.

**Locatario:** {{locatario_nome}}, {{locatario_estado_civil}}, {{locatario_profissao}}, inscrito(a) no CPF/CNPJ sob o nº {{locatario_cpf_cnpj}}, RG/inscricao nº {{locatario_rg}}, residente e domiciliado(a) em {{locatario_endereco}}.

As partes resolvem celebrar o presente Instrumento Particular de Locacao de Bem Imovel Para Fins Residenciais, integralmente regido pelas clausulas, condicoes e estipulacoes adiante estabelecidas.

## 1 - OBJETO

1.1. O objeto do presente instrumento consiste na locacao, pelo LOCATARIO, do imovel de propriedade do LOCADOR, situado em {{imovel_endereco_completo}}, matriculado sob o nº {{imovel_matricula}} no {{imovel_cartorio}}, com area privativa de {{imovel_area_privativa}}, assim descrito:

{{imovel_descricao_juridica}}

1.2. A locacao destina-se exclusivamente a {{finalidade_locacao}}, vedada a alteracao de finalidade sem autorizacao previa e escrita do LOCADOR.

1.3. Observacoes contratuais sobre o imovel, moveis, estado de conservacao, equipamentos, vistorias ou anexos:

{{imovel_observacoes_contratuais}}

## 2 - PRAZO

2.1. O prazo da locacao e de {{prazo_meses}} meses, iniciando-se em {{data_inicio}} e encerrando-se em {{data_fim}}, independentemente de aviso ou notificacao, salvo renovacao expressa entre as partes.

2.2. Com aviso previo no prazo pactuado entre as partes, LOCADOR e LOCATARIO deverao informar eventual interesse em renovacao, reajuste, encerramento ou continuidade da locacao.

2.3. Caso o LOCATARIO tenha intencao de permanecer no imovel apos o termino do contrato, devera solicitar tal permanencia por escrito ao LOCADOR, que podera concordar ou nao.

## 3 - ALUGUEL, REAJUSTE E PAGAMENTO

3.1. O LOCATARIO obriga-se a pagar ao LOCADOR o aluguel mensal de {{valor_aluguel}} ({{valor_aluguel_extenso}}), vencivel no dia {{dia_vencimento}} de cada mes.

3.2. O pagamento sera feito por boleto bancario, transferencia, PIX ou outro meio indicado por escrito pelo LOCADOR, valendo a comprovacao bancaria como prova de pagamento da quantia indicada.

{{dados_bancarios}}

3.3. O aluguel mensal sera reajustado anualmente na data de aniversario deste instrumento, de acordo com a variacao acumulada do indice {{indice_reajuste}}, ou outro indice que venha a substitui-lo.

3.4. A falta de pagamento, nos prazos determinados neste contrato, dos alugueis e encargos constituira o LOCATARIO em mora, independentemente de aviso ou interpelacao judicial ou extrajudicial.

3.5. Apos o vencimento, o valor devido podera ser reajustado, acrescido de juros, multa, honorarios e demais encargos de cobranca previstos neste contrato ou na legislacao aplicavel.

{{parcelas_pagamento}}

## 4 - GARANTIA LOCATICIA

4.1. A garantia da locacao sera do tipo {{garantia_tipo}}.

4.2. Quando a garantia for caucao, o valor sera de {{caucao_valor}} ({{caucao_valor_extenso}}), observadas as condicoes legais e contratuais para deposito, uso, devolucao ou compensacao.

## 5 - ENCARGOS DO LOCATARIO

5.1. Serao de responsabilidade do LOCATARIO os encargos descritos abaixo, alem daqueles que decorram do uso regular do imovel:

{{encargos_locatario}}

5.2. Os encargos como luz, agua, internet, IPTU, taxas e demais despesas assumidas deverao ser pagos pontualmente nas datas de vencimento, respondendo o LOCATARIO por acrescimos e multas decorrentes de atraso.

5.3. O LOCATARIO obriga-se a transferir para seu nome as contas de consumo que forem exigidas, ficando vedado celebrar acordos que onerem o LOCADOR ou o imovel sem autorizacao.

## 6 - CONSERVACAO, USO E VISTORIA

6.1. O LOCATARIO declara receber o imovel em condicoes de uso e conservacao compatíveis com a vistoria inicial, obrigando-se a conserva-lo e restitui-lo ao final da locacao no estado em que o recebeu, ressalvado o desgaste natural.

6.2. O LOCATARIO nao podera realizar obras, alteracoes, benfeitorias ou modificacoes sem autorizacao previa e escrita do LOCADOR.

6.3. As benfeitorias realizadas sem autorizacao nao darao direito a indenizacao ou retencao, salvo previsao expressa em contrario.

## 7 - RESTITUICAO DO IMOVEL

7.1. Vencido o prazo da locacao, o LOCATARIO obriga-se a restituir o imovel inteiramente desocupado, livre de pessoas e coisas, em perfeito estado de conservacao e uso, ressalvados os desgastes normais.

7.2. Caso ao termino da locacao o imovel nao seja devolvido nas condicoes pactuadas, o LOCATARIO respondera pelos servicos, materiais, perdas, danos, lucros cessantes e alugueis relativos ao periodo necessario a recomposicao.

7.3. A entrega das chaves para vistoria devera ocorrer junto ao LOCADOR ou representante legal, apos o cumprimento integral das condicoes contratuais, sob pena de continuidade da responsabilidade por alugueis e encargos ate o acerto final.

## 8 - MULTA E RESCISAO

8.1. A infracao de qualquer clausula deste instrumento, inclusive as referentes a uso, manutencao, prazo contratual e restituicao do imovel, sujeitara o infrator a multa de {{multa_rescisoria}}, facultando a parte inocente considerar resolvido o contrato.

8.2. A multa nao prejudica eventual complemento por prejuizos suplementares que nao puderem ser suportados pelo valor pactuado.

8.3. Quando o LOCATARIO quiser entregar as chaves e o LOCADOR, pela vistoria, encontrar defeito, dano ou pendencia, as chaves poderao ser recusadas ate reposicao do imovel nas condicoes contratadas, correndo alugueis e encargos por conta do LOCATARIO.

## 9 - SINISTRO E DESAPROPRIACAO

9.1. No caso de sinistro parcial ou total que impossibilite a habitacao do imovel, o presente contrato podera ser rescindido independentemente de aviso ou interpelacao.

9.2. No caso de incendio parcial que obrigue obras de reconstrucao, a vigencia do contrato podera ser suspensa pelo tempo de duracao das obras, conforme pactuacao entre as partes e legislacao aplicavel.

9.3. Na hipotese de desapropriacao do imovel, o contrato ficara automaticamente rescindido, sem indenizacao entre as partes, ressalvado o direito de cada contratante haver diretamente do poder expropriante a indenizacao que entender devida.

## 10 - SUCESSAO

10.1. Falecendo o LOCADOR, seus sucessores ficarao sub-rogados nos direitos do presente contrato, devendo o LOCATARIO depositar o aluguel em conta indicada pelo inventariante ou representante legal, apos notificacao.

10.2. Falecendo o LOCATARIO, a continuidade ou encerramento da locacao observara a legislacao aplicavel e as comunicacoes formais entre as partes.

## 11 - INTERMEDIACAO

11.1. A intermediacao imobiliaria, quando existente, foi realizada por {{imobiliaria_nome}}, CNPJ {{imobiliaria_cnpj}}, CRECI {{imobiliaria_creci}}, e/ou por {{corretor_nome}}, CRECI {{corretor_creci}}, limitando-se a responsabilidade da intermediacao aos atos de aproximacao e formalizacao da locacao.

## 12 - FORO

12.1. Para dirimir quaisquer duvidas oriundas deste contrato, as partes elegem o foro de {{foro}}, com renuncia a qualquer outro, por mais privilegiado que seja.

{{observacoes_especificas}}

{{cidade}}, {{data_contrato}}.

## ASSINATURAS

________________________________________  
{{locador_nome}}  
Locador

________________________________________  
{{locatario_nome}}  
Locatario

________________________________________  
{{testemunha_1_nome}}  
CPF: {{testemunha_1_cpf}}

________________________________________  
{{testemunha_2_nome}}  
CPF: {{testemunha_2_cpf}}
