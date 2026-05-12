# Setup operacional dos templates Google Docs da Jurema Brokers

Base tecnica: `docs/jurema-contract-templates-map.md`

Objetivo: transformar os 6 modelos oficiais `.docx` em Google Docs templates com placeholders padronizados, sem versionar contratos reais, dados pessoais ou documentos sensiveis no repo.

Status geral: pendente de subir para Google Drive/Docs.

## Regras operacionais

- Trabalhar sempre em copia dos `.docx` oficiais.
- Nao subir contratos reais para o repo.
- Nao salvar dados pessoais reais no markdown, no app ou em fixtures.
- Remover nomes, documentos, enderecos pessoais, emails, telefones, dados bancarios e valores reais antes de transformar o arquivo em template.
- Manter apenas a estrutura juridica do documento e substituir dados variaveis por placeholders `{{snake_case}}`.
- Usar `{{imovel_descricao_juridica}}` para o objeto/imovel contratual; nao usar titulo comercial.
- Registrar o `template_file_id` somente depois de o Google Doc final estar revisado.

## Como preparar cada Google Docs template

1. Localize o arquivo oficial em `D:\YZIHUB\CLAUDE\JUREMA BROKERS\CONTRATOS`.
2. Duplique o `.docx` fora do repo, em uma pasta de trabalho privada.
3. Renomeie a copia usando o `template_key`, por exemplo: `compra_venda_padrao.template.docx`.
4. Abra a copia no Word ou Google Docs.
5. Remova todos os dados reais:
   - nomes de pessoas e empresas;
   - CPF, CNPJ, RG, CNH, CRECI e inscricoes;
   - emails, telefones e enderecos pessoais;
   - dados bancarios;
   - valores reais;
   - descricoes reais de imoveis;
   - assinaturas, rubricas e anexos com dados reais.
6. Substitua os trechos variaveis pelos placeholders definidos neste documento.
7. Suba a copia sanitizada para o Google Drive.
8. Abra o arquivo no Google Docs e confirme que ele foi convertido para formato Google Docs.
9. Copie o `template_file_id` da URL do Google Docs.
10. Registre o par `template_key` + `template_file_id` na configuracao futura do app.
11. Teste com dados ficticios antes de liberar para contratos reais.

## Onde pegar o `template_file_id`

Em uma URL do Google Docs como:

```text
https://docs.google.com/document/d/TEMPLATE_FILE_ID/edit
```

O `template_file_id` e o trecho entre `/document/d/` e `/edit`.

Exemplo ficticio:

```text
template_key: compra_venda_padrao
template_file_id: 1AbCdEfGhIjKlMnOpQrStUvWxYz000000000000
```

## Como testar com dados ficticios

- Criar um contrato de teste com nomes ficticios, documentos ficticios e endereco ficticio.
- Usar uma descricao juridica ficticia, mas realista, em `{{imovel_descricao_juridica}}`.
- Preencher `{{forma_pagamento}}` como texto final ja formatado.
- Preencher blocos de lista com 1 item, varios itens e vazio, quando aplicavel.
- Confirmar que placeholders nao preenchidos ficam visiveis no documento de teste.
- Validar que valores monetarios nao duplicam extenso ou simbolo `R$`.
- Validar que o titulo comercial do imovel nao aparece no objeto contratual.

## Placeholders de bloco para listas

Os placeholders abaixo representam blocos de texto prontos, montados pelo app ou pelo fluxo de renderizacao. Eles devem ser inseridos no Google Doc em uma linha ou paragrafo proprio quando possivel.

### `{{forma_pagamento}}`

Uso: bloco textual com a forma de pagamento completa.

Formato esperado:

```text
Entrada no valor de {{entrada_valor}}, paga na assinatura; saldo de {{saldo_valor}}, pago por financiamento bancario em ate {{prazo_pagamento}}.
```

Observacoes:

- Pode conter uma frase unica ou lista de condicoes.
- Deve chegar pronto para exibicao no contrato.
- Nao deve repetir `{{valor_total}}`.

### `{{bens_permutados}}`

Uso: lista dos bens/unidades dados em permuta.

Formato esperado:

```text
1. {{bem_permutado_descricao}} - matricula {{bem_permutado_matricula}} - valor {{bem_permutado_valor}}.
2. {{bem_permutado_descricao}} - matricula {{bem_permutado_matricula}} - valor {{bem_permutado_valor}}.
```

Observacoes:

- Usado principalmente em `compra_venda_permuta`.
- Deve suportar uma ou mais unidades.
- Se nao houver permuta, o template nao deve usar este bloco.

### `{{parcelas_pagamento}}`

Uso: lista de parcelas de pagamento do contrato.

Formato esperado:

```text
1. {{parcela_1_valor}}, com vencimento em {{parcela_1_data}}.
2. {{parcela_2_valor}}, com vencimento em {{parcela_2_data}}.
```

Observacoes:

- Pode ser usado em compra e venda, permuta, locacao ou honorarios.
- Deve conter valores ja formatados em BRL.
- Datas devem vir no padrao brasileiro.

### `{{corretores_participantes}}`

Uso: lista de corretores que participam da intermediacao.

Formato esperado:

```text
1. {{corretor_nome}}, CRECI {{corretor_creci}}, CPF {{corretor_cpf}}.
2. {{corretor_nome}}, CRECI {{corretor_creci}}, CPF {{corretor_cpf}}.
```

Observacoes:

- Usado principalmente em `honorarios_corretagem`.
- Pode ser omitido quando houver apenas corretor principal.
- Nao registrar dados reais no template base.

### `{{bens_inclusos}}`

Uso: lista de bens, moveis ou utensilios incluidos na venda.

Formato esperado:

```text
1. {{bem_incluso_descricao}}.
2. {{bem_incluso_descricao}}.
```

Observacoes:

- Usado principalmente em compra e venda de unidade mobiliada.
- Se nao houver bens inclusos, o template deve remover ou neutralizar a clausula correspondente.

### `{{bens_excluidos}}`

Uso: lista de bens, moveis ou utensilios excluidos da venda.

Formato esperado:

```text
1. {{bem_excluido_descricao}}.
2. {{bem_excluido_descricao}}.
```

Observacoes:

- Usado quando a clausula de bens inclusos possui excecoes.
- Se nao houver bens excluidos, o template deve remover ou neutralizar a frase de excecao.

## Checklist por template

### `compra_venda_padrao`

- Arquivo original: `COMPRA E VENDA PADRAO.docx`
- `template_key`: `compra_venda_padrao`
- Pendencia de `template_file_id`: pendente

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

Blocos de texto dinamicos:

- `{{forma_pagamento}}`
- `{{parcelas_pagamento}}`
- `{{bens_inclusos}}`
- `{{bens_excluidos}}`

Checklist:

- [ ] Duplicar o `.docx` oficial fora do repo.
- [ ] Remover dados reais do vendedor e comprador.
- [ ] Substituir quadro resumo por placeholders.
- [ ] Trocar descricao real do imovel por `{{imovel_descricao_juridica}}`.
- [ ] Trocar forma de pagamento real por `{{forma_pagamento}}`.
- [ ] Revisar clausulas de bens inclusos/excluidos.
- [ ] Converter para Google Docs.
- [ ] Registrar `template_file_id`.
- [ ] Testar com dados ficticios.

### `compra_venda_casa`

- Arquivo original: `COMPRA E VENDA CASA.docx`
- `template_key`: `compra_venda_casa`
- Pendencia de `template_file_id`: pendente

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

Blocos de texto dinamicos:

- `{{forma_pagamento}}`
- `{{parcelas_pagamento}}`

Checklist:

- [ ] Duplicar o `.docx` oficial fora do repo.
- [ ] Remover dados reais das partes.
- [ ] Substituir endereco, matricula e areas por placeholders.
- [ ] Confirmar que `{{imovel_descricao_juridica}}` inclui casa, terreno, matricula e cartorio quando disponiveis.
- [ ] Trocar pagamento real por `{{forma_pagamento}}`.
- [ ] Converter para Google Docs.
- [ ] Registrar `template_file_id`.
- [ ] Testar com dados ficticios.

### `compra_venda_area`

- Arquivo original: `COMPRA E VENDA - AREA.docx`
- `template_key`: `compra_venda_area`
- Pendencia de `template_file_id`: pendente

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

Blocos de texto dinamicos:

- `{{forma_pagamento}}`
- `{{parcelas_pagamento}}`

Checklist:

- [ ] Duplicar o `.docx` oficial fora do repo.
- [ ] Remover dados reais das partes.
- [ ] Substituir descricao de predio/lote/terreno por `{{imovel_descricao_juridica}}`.
- [ ] Preservar estrutura de medidas e confrontacoes usando placeholders.
- [ ] Trocar pagamento real por `{{forma_pagamento}}`.
- [ ] Converter para Google Docs.
- [ ] Registrar `template_file_id`.
- [ ] Testar com dados ficticios.

### `compra_venda_permuta`

- Arquivo original: `COMPRA E VENDA C PERMUTA.docx`
- `template_key`: `compra_venda_permuta`
- Pendencia de `template_file_id`: pendente

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
- `{{bens_permutados}}`
- `{{saldo_em_dinheiro}}`
- `{{prazo_entrega_imovel}}`
- `{{repasse_aluguel}}`
- `{{observacoes_contratuais}}`

Blocos de texto dinamicos:

- `{{forma_pagamento}}`
- `{{bens_permutados}}`
- `{{parcelas_pagamento}}`

Checklist:

- [ ] Duplicar o `.docx` oficial fora do repo.
- [ ] Remover dados reais das partes.
- [ ] Substituir imovel principal por `{{imovel_descricao_juridica}}`.
- [ ] Substituir unidades/bens de permuta por `{{bens_permutados}}`.
- [ ] Substituir condicoes financeiras por `{{forma_pagamento}}`.
- [ ] Revisar regras de entrega, posse ou repasse de aluguel.
- [ ] Converter para Google Docs.
- [ ] Registrar `template_file_id`.
- [ ] Testar com dados ficticios e mais de um bem permutado.

### `locacao_residencial`

- Arquivo original: `LOCAÇÃO.docx`
- `template_key`: `locacao_residencial`
- Pendencia de `template_file_id`: pendente

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

Blocos de texto dinamicos:

- `{{parcelas_pagamento}}`

Checklist:

- [ ] Duplicar o `.docx` oficial fora do repo.
- [ ] Remover dados reais de locador e locatario.
- [ ] Substituir objeto da locacao por `{{imovel_descricao_juridica}}`.
- [ ] Substituir aluguel, prazo, vencimento e garantias por placeholders.
- [ ] Confirmar destinacao residencial.
- [ ] Converter para Google Docs.
- [ ] Registrar `template_file_id`.
- [ ] Testar com dados ficticios.

### `honorarios_corretagem`

- Arquivo original: `PAGAMENTO DE HONORÁRIOS.docx`
- `template_key`: `honorarios_corretagem`
- Pendencia de `template_file_id`: pendente

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
- `{{parcelas_pagamento}}`
- `{{negocio_tipo}}`
- `{{permuta_percentual}}`
- `{{inscricao_municipal}}`
- `{{matricula}}`
- `{{cartorio}}`
- `{{observacoes_contratuais}}`

Blocos de texto dinamicos:

- `{{corretores_participantes}}`
- `{{parcelas_pagamento}}`

Checklist:

- [ ] Duplicar o `.docx` oficial fora do repo.
- [ ] Remover dados reais da contratante, corretores e partes citadas.
- [ ] Substituir objeto intermediado por `{{imovel_descricao_juridica}}`.
- [ ] Substituir lista de corretores por `{{corretores_participantes}}`.
- [ ] Substituir valores e parcelas de honorarios por placeholders.
- [ ] Converter para Google Docs.
- [ ] Registrar `template_file_id`.
- [ ] Testar com dados ficticios e multiplos corretores.

## Registro futuro por `template_key`

Quando os Google Docs estiverem prontos, cada template deve ter um registro com:

```text
template_key: compra_venda_padrao
template_file_id: PENDENTE
source_file_name: COMPRA E VENDA PADRAO.docx
status: active | draft
updated_at: YYYY-MM-DD
```

Templates a registrar:

- `compra_venda_padrao`
- `compra_venda_casa`
- `compra_venda_area`
- `compra_venda_permuta`
- `locacao_residencial`
- `honorarios_corretagem`

## Proximos passos para cadastro no app

- Definir onde o app armazenara `template_key` e `template_file_id` sem alterar schema ate haver aprovacao.
- Criar tela ou configuracao operacional para cadastrar o `template_file_id` de cada `template_key`.
- Validar quais campos do front ja existem e quais faltam para preencher todos os placeholders.
- Implementar renderizacao de blocos de lista com dados estruturados ou texto final controlado.
- Criar rotina de teste com dados ficticios antes de liberar envio real.
