# Mapa tecnico dos templates oficiais de contrato da Jurema Brokers

Fonte consultada somente para leitura:
`D:\YZIHUB\CLAUDE\JUREMA BROKERS\CONTRATOS`

Este documento nao copia contratos reais nem clausulas completas. Ele mapeia os modelos oficiais para uma especificacao tecnica de placeholders padronizados, a ser usada futuramente na criacao/subida dos templates no Google Drive/Docs.

Status geral: pendente de subir para Google Drive/Docs.

## Campos comuns

### Placeholders comuns obrigatorios

- `{{data_contrato}}`
- `{{cidade_uf}}`
- `{{contrato_titulo}}`
- `{{imovel_descricao_juridica}}`
- `{{valor_total}}`
- `{{forma_pagamento}}`

### Placeholders comuns opcionais

- `{{valor_total_extenso}}`
- `{{observacoes_contratuais}}`
- `{{foro}}`
- `{{assinatura_local_data}}`
- `{{testemunha_1_nome}}`
- `{{testemunha_1_cpf}}`
- `{{testemunha_2_nome}}`
- `{{testemunha_2_cpf}}`

### Campos comuns que precisam existir no front

- Tipo/modelo do contrato
- Lead/comprador/locatario/contratante selecionado
- Imovel selecionado
- Corretor responsavel
- Valor total do contrato
- Forma de pagamento
- Observacoes contratuais
- Data do contrato
- Cidade/UF
- Testemunhas, quando aplicavel

### Campos comuns que precisam vir de `imoveis.metadata`

- `metadata.endereco_completo`
- `metadata.descricao_juridica`
- `metadata.matricula`
- `metadata.cartorio`
- `metadata.area_privativa`
- `metadata.area_construida`
- `metadata.area_terreno`
- `metadata.medidas_confrontacoes`
- `metadata.inscricao_municipal`
- `metadata.observacoes_contratuais`

## Templates

### `compra_venda_padrao`

- Nome do arquivo original: `COMPRA E VENDA PADRAO.docx`
- Finalidade: promessa/contrato de compra e venda padrao de imovel, com quadro resumo, vendedor, comprador, imovel, preco e forma de pagamento.
- Status: pendente de subir para Google Drive/Docs.
- Campo futuro: `template_file_id`

Placeholders obrigatorios:

- `{{vendedor_nome}}`
- `{{vendedor_qualificacao}}`
- `{{comprador_nome}}`
- `{{comprador_qualificacao}}`
- `{{imovel_descricao_juridica}}`
- `{{valor_total}}`
- `{{forma_pagamento}}`

Placeholders opcionais:

- `{{valor_total_extenso}}`
- `{{entrada_valor}}`
- `{{entrada_valor_extenso}}`
- `{{saldo_valor}}`
- `{{saldo_valor_extenso}}`
- `{{financiamento_banco}}`
- `{{prazo_pagamento}}`
- `{{bens_inclusos}}`
- `{{bens_excluidos}}`
- `{{observacoes_contratuais}}`

Campos que precisam existir no front:

- Dados do vendedor
- Dados do comprador
- Valor total
- Entrada/sinal
- Saldo
- Forma de pagamento
- Banco/financiamento, quando houver
- Bens inclusos/excluidos, quando houver

Campos que precisam vir de `imoveis.metadata`:

- `metadata.descricao_juridica`
- `metadata.endereco_completo`
- `metadata.area_privativa`
- `metadata.matricula`
- `metadata.cartorio`
- `metadata.observacoes_contratuais`

Observacoes importantes:

- O campo IMOVEL deve usar descricao juridica/contratual completa, nao titulo comercial.
- Quando houver quadro resumo, a mesma descricao juridica deve ser reutilizada nas referencias ao objeto do contrato.

### `compra_venda_casa`

- Nome do arquivo original: `COMPRA E VENDA CASA.docx`
- Finalidade: promessa de compra e venda de casa, com qualificacao das partes, objeto, matricula, areas e condicoes de entrega.
- Status: pendente de subir para Google Drive/Docs.
- Campo futuro: `template_file_id`

Placeholders obrigatorios:

- `{{vendedor_nome}}`
- `{{vendedor_qualificacao}}`
- `{{comprador_nome}}`
- `{{comprador_qualificacao}}`
- `{{imovel_descricao_juridica}}`
- `{{valor_total}}`
- `{{forma_pagamento}}`

Placeholders opcionais:

- `{{valor_total_extenso}}`
- `{{area_construida}}`
- `{{area_terreno}}`
- `{{matricula}}`
- `{{cartorio}}`
- `{{prazo_entrega}}`
- `{{encargos_responsabilidade}}`
- `{{observacoes_contratuais}}`

Campos que precisam existir no front:

- Dados do vendedor
- Dados do comprador
- Valor total
- Forma de pagamento
- Prazo/condicao de entrega
- Responsabilidade por encargos

Campos que precisam vir de `imoveis.metadata`:

- `metadata.descricao_juridica`
- `metadata.endereco_completo`
- `metadata.area_construida`
- `metadata.area_terreno`
- `metadata.matricula`
- `metadata.cartorio`
- `metadata.medidas_confrontacoes`

Observacoes importantes:

- O modelo usa informacoes de casa/terreno; area construida e area do terreno devem estar disponiveis para evitar texto incompleto.

### `compra_venda_area`

- Nome do arquivo original: `COMPRA E VENDA - AREA.docx`
- Finalidade: compra e venda de area, lote, terreno ou predio com descricao registral e medidas/confrontacoes.
- Status: pendente de subir para Google Drive/Docs.
- Campo futuro: `template_file_id`

Placeholders obrigatorios:

- `{{vendedor_nome}}`
- `{{vendedor_qualificacao}}`
- `{{comprador_nome}}`
- `{{comprador_qualificacao}}`
- `{{imovel_descricao_juridica}}`
- `{{valor_total}}`
- `{{forma_pagamento}}`

Placeholders opcionais:

- `{{valor_total_extenso}}`
- `{{entrada_valor}}`
- `{{saldo_valor}}`
- `{{prazo_quitacao}}`
- `{{medidas_confrontacoes}}`
- `{{matricula}}`
- `{{cartorio}}`
- `{{inscricao_municipal}}`
- `{{observacoes_contratuais}}`

Campos que precisam existir no front:

- Dados do vendedor
- Dados do comprador
- Valor total
- Entrada/saldo
- Prazo de quitacao
- Forma de pagamento

Campos que precisam vir de `imoveis.metadata`:

- `metadata.descricao_juridica`
- `metadata.endereco_completo`
- `metadata.area_terreno`
- `metadata.medidas_confrontacoes`
- `metadata.matricula`
- `metadata.cartorio`
- `metadata.inscricao_municipal`

Observacoes importantes:

- Este modelo depende fortemente de descricao registral, medidas e confrontacoes.
- Nao usar frase "imovel denominado" antes da descricao juridica completa.

### `compra_venda_permuta`

- Nome do arquivo original: `COMPRA E VENDA C PERMUTA.docx`
- Finalidade: compra e venda com permuta, envolvendo imovel principal e bens/unidades dados como parte do pagamento.
- Status: pendente de subir para Google Drive/Docs.
- Campo futuro: `template_file_id`

Placeholders obrigatorios:

- `{{vendedor_nome}}`
- `{{vendedor_qualificacao}}`
- `{{comprador_nome}}`
- `{{comprador_qualificacao}}`
- `{{imovel_descricao_juridica}}`
- `{{valor_total}}`
- `{{forma_pagamento}}`
- `{{permuta_descricao}}`
- `{{permuta_valor_total}}`

Placeholders opcionais:

- `{{valor_total_extenso}}`
- `{{permuta_unidade_1_descricao}}`
- `{{permuta_unidade_1_matricula}}`
- `{{permuta_unidade_1_valor}}`
- `{{permuta_unidade_2_descricao}}`
- `{{permuta_unidade_2_matricula}}`
- `{{permuta_unidade_2_valor}}`
- `{{saldo_em_dinheiro}}`
- `{{prazo_entrega_imovel}}`
- `{{repasse_aluguel}}`
- `{{observacoes_contratuais}}`

Campos que precisam existir no front:

- Dados do vendedor
- Dados do comprador
- Valor total
- Forma de pagamento
- Descricao dos bens dados em permuta
- Valores individuais da permuta
- Saldo em dinheiro, quando houver
- Regras de posse, entrega ou repasse de aluguel, quando houver

Campos que precisam vir de `imoveis.metadata`:

- `metadata.descricao_juridica`
- `metadata.endereco_completo`
- `metadata.area_construida`
- `metadata.area_terreno`
- `metadata.medidas_confrontacoes`
- `metadata.matricula`
- `metadata.cartorio`
- `metadata.observacoes_contratuais`

Observacoes importantes:

- O modelo exige estrutura para mais de um bem/unidade de permuta.
- Pode ser necessario suportar lista de bens permutados no front antes de automatizar 100% o template.

### `locacao_residencial`

- Nome do arquivo original: `LOCAÇÃO.docx`
- Finalidade: contrato de locacao residencial, com locador, locatario, objeto, destinacao, aluguel e condicoes da locacao.
- Status: pendente de subir para Google Drive/Docs.
- Campo futuro: `template_file_id`

Placeholders obrigatorios:

- `{{locador_nome}}`
- `{{locador_qualificacao}}`
- `{{locatario_nome}}`
- `{{locatario_qualificacao}}`
- `{{imovel_descricao_juridica}}`
- `{{aluguel_valor}}`
- `{{prazo_locacao}}`
- `{{data_inicio}}`
- `{{data_fim}}`

Placeholders opcionais:

- `{{aluguel_valor_extenso}}`
- `{{dia_vencimento}}`
- `{{garantia_tipo}}`
- `{{garantia_descricao}}`
- `{{indice_reajuste}}`
- `{{condominio_responsavel}}`
- `{{iptu_responsavel}}`
- `{{taxas_responsavel}}`
- `{{multa_rescisoria}}`
- `{{destinacao_imovel}}`
- `{{observacoes_contratuais}}`

Campos que precisam existir no front:

- Dados do locador
- Dados do locatario
- Valor do aluguel
- Dia de vencimento
- Prazo da locacao
- Inicio/fim
- Garantia locaticia
- Responsabilidades por condominio, IPTU e taxas
- Indice de reajuste

Campos que precisam vir de `imoveis.metadata`:

- `metadata.descricao_juridica`
- `metadata.endereco_completo`
- `metadata.matricula`
- `metadata.cartorio`
- `metadata.area_privativa`
- `metadata.observacoes_contratuais`

Observacoes importantes:

- O objeto da locacao deve receber descricao juridica do imovel, mantendo o titulo comercial apenas como label de selecao.
- O modelo observado e residencial; se houver locacao comercial, criar outro `template_key`.

### `honorarios_corretagem`

- Nome do arquivo original: `PAGAMENTO DE HONORÁRIOS.docx`
- Finalidade: contrato de honorarios de corretagem/intermediacao imobiliaria, com contratante/construtora, corretores, objeto intermediado, percentual e forma de pagamento.
- Status: pendente de subir para Google Drive/Docs.
- Campo futuro: `template_file_id`

Placeholders obrigatorios:

- `{{contratante_nome}}`
- `{{contratante_qualificacao}}`
- `{{corretor_principal_nome}}`
- `{{corretor_principal_qualificacao}}`
- `{{imovel_descricao_juridica}}`
- `{{honorarios_valor}}`
- `{{honorarios_forma_pagamento}}`

Placeholders opcionais:

- `{{honorarios_valor_extenso}}`
- `{{honorarios_percentual}}`
- `{{corretores_participantes}}`
- `{{parcelas_honorarios}}`
- `{{negocio_tipo}}`
- `{{permuta_percentual}}`
- `{{inscricao_municipal}}`
- `{{matricula}}`
- `{{cartorio}}`
- `{{observacoes_contratuais}}`

Campos que precisam existir no front:

- Contratante/construtora
- Corretor principal
- Corretores participantes, quando houver
- Valor dos honorarios
- Percentual dos honorarios
- Forma/parcelas de pagamento
- Tipo de negocio intermediado

Campos que precisam vir de `imoveis.metadata`:

- `metadata.descricao_juridica`
- `metadata.endereco_completo`
- `metadata.area_terreno`
- `metadata.medidas_confrontacoes`
- `metadata.inscricao_municipal`
- `metadata.matricula`
- `metadata.cartorio`
- `metadata.observacoes_contratuais`

Observacoes importantes:

- Este modelo pode envolver multiplos corretores; o front precisa suportar lista ou texto estruturado para `{{corretores_participantes}}`.
- O objeto de intermediacao deve usar descricao juridica/registral do imovel, nao nome comercial.

## Pendencias para Google Drive/Docs

- Criar arquivos Google Docs a partir dos seis modelos oficiais, sem versionar DOCX no repo.
- Substituir dados reais por placeholders snake_case conforme este mapa.
- Registrar `template_file_id` de cada Google Doc em configuracao apropriada futura.
- Validar renderizacao com dados ficticios antes de usar com contratos reais.
- Confirmar se `locacao_residencial` tera variante comercial.
- Definir suporte de front para listas estruturadas: bens de permuta, parcelas e corretores participantes.
