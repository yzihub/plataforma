export const JUREMA_CONTRACT_TEMPLATES = {
  compra_venda_padrao: {
    label: "Compra e venda padrão",
    templateFileId: "1RsBvtHqSfiiLQ8b7hV0VhxL8bw0ebkItr8ij2IMktN0",
    placeholders: [
      "vendedor_qualificacao",
      "comprador_qualificacao",
      "imovel_descricao_juridica",
      "valor_total",
      "valor_total_extenso",
      "forma_pagamento",
    ],
    body: `CONTRATO DE COMPROMISSO DE VENDA E COMPRA DE IMÓVEL
QUADRO RESUMO
PROMITENTE VENDEDOR
{{vendedor_qualificacao}}
PROMITENTE COMPRADOR
{{comprador_qualificacao}}
IMÓVEL
{{imovel_descricao_juridica}}
PREÇO
O imóvel é vendido pelo preço de {{valor_total}} ({{valor_total_extenso}}).
FORMA DE PAGAMENTO
{{forma_pagamento}}

CONDIÇÕES
Por este instrumento particular de venda e compra as partes qualificadas no quadro resumo acima têm entre si justo e contratado o compromisso de venda e compra do imóvel descrito, mediante as cláusulas e condições a seguir especificadas.
1 – OBJETO
1.1. O VENDEDOR declara ser legítimo possuidor e proprietário do imóvel descrito e caracterizado no quadro resumo, de forma livre e desembaraçada de quaisquer ônus real, pessoal, fiscal ou extrajudicial, dívidas, arrestos, sequestros ou restrições de qualquer natureza e, pelo presente instrumento e na melhor forma de direito, promete vender ao COMPRADOR, que promete comprar, o referido imóvel em conformidade com as cláusulas e condições aqui estabelecidas.
1.2. {{bens_inclusos}}
1.3. {{bens_excluidos}}
2 – PREÇO
2.1. O preço certo e ajustado da venda ora prometida é de {{valor_total}} ({{valor_total_extenso}}), a ser pago pelo COMPRADOR ao VENDEDOR de acordo com a forma de pagamento descrita no quadro resumo.
2.2. {{forma_pagamento}}
3 – INADIMPLEMENTO
3.1. A falta de qualquer dos pagamentos estipulados neste contrato autorizará o VENDEDOR, à sua escolha, a considerar rescindido este contrato, sem prévio aviso, sem prejuízo das multas previstas, perdendo o COMPRADOR os valores pagos a título de cláusula penal compensatória, conforme condições acordadas entre as partes.
4 – POSSE
4.1. A posse do imóvel objeto deste contrato será transmitida ao COMPRADOR na forma e prazo ajustados entre as partes, especialmente após {{condicao_entrega_posse}}.
4.2. A entrega das chaves do imóvel será feita mediante {{condicao_entrega_chaves}}.
5 – ESCRITURA
5.1. As despesas com o ato da escritura, tais como ITBI, custas e emolumentos devidos ao Tabelião, bem como ao oficial de Registro de Imóveis para registro da respectiva escritura, serão de exclusiva responsabilidade de {{responsavel_despesas_escritura}}.
6 – TRIBUTOS E CONTAS DE CONSUMO
6.1. A partir de {{data_responsabilidade_encargos}}, correrão por conta exclusiva do COMPRADOR todos os impostos, taxas, contribuições e contas de consumo incidentes sobre o imóvel objeto deste contrato, ainda que lançados em nome do VENDEDOR.
7 – IRREVOGABILIDADE E IRRETRATABILIDADE
7.1. O presente contrato é celebrado sob a condição expressa de sua irrevogabilidade e irretratabilidade, ressalvado o eventual inadimplemento das obrigações assumidas pelas partes ou descumprimento das condições aqui impostas.
8 – DA RESPONSABILIDADE PELA INTERMEDIAÇÃO
8.1. Por força dos artigos 722 a 729 da Lei nº 10.406/2002, a responsabilidade da imobiliária {{imobiliaria_nome}} – CRECI {{imobiliaria_creci}}, que realizou a intermediação imobiliária, limita-se à mediação da presente transação, excluindo-se de quaisquer obrigações assumidas pelas partes contratantes.
8.2. O pagamento da corretagem será realizado conforme segue: {{comissao_descricao}}.
9 – DISPOSIÇÕES GERAIS
9.1. Para dirimir quaisquer questões que direta ou indiretamente surgirem deste contrato, as partes elegem o foro de {{foro}}, com renúncia expressa de qualquer outro.
9.2. Para todos os fins e efeitos de Direito, os contratantes declaram aceitar o presente contrato nos expressos termos em que foi lavrado, obrigando-se por si, herdeiros e sucessores, a bem e fielmente cumpri-lo.
{{cidade}}, {{data_contrato}}.

________________________________________
{{vendedor_nome}}VENDEDOR
________________________________________
{{comprador_nome}}COMPRADOR
________________________________________
{{testemunha_1_nome}}TESTEMUNHA
________________________________________
{{testemunha_2_nome}}TESTEMUNHA`,
  },
  compra_venda_casa: {
    label: "Compra e venda casa",
    templateFileId: "1WMxUkrRODLOCdtSSViU8NV9lARLImTELlwIySv6hegE",
    placeholders: [
      "vendedor_qualificacao",
      "comprador_qualificacao",
      "imovel_descricao_juridica",
      "imovel_endereco",
      "imovel_matricula",
      "imovel_cartorio",
      "forma_pagamento",
    ],
    body: `CONTRATO PARTICULAR DE COMPROMISSO DE COMPRA E VENDA DE IMÓVEL
PROMITENTE VENDEDOR: {{vendedor_qualificacao}}, doravante denominado PROMITENTE VENDEDOR;
PROMISSÁRIO COMPRADOR: {{comprador_qualificacao}}, doravante denominado PROMISSÁRIO COMPRADOR;
As partes acima identificadas têm entre si justo e acertado o presente Contrato de Promessa de Compra e Venda de Imóvel, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente instrumento.
CLÁUSULA PRIMEIRA – OBJETO
O presente contrato tem por objeto a compra e venda do imóvel situado em {{imovel_endereco}}, assim descrito: {{imovel_descricao_juridica}}.
Ambientes, áreas e características relevantes: {{imovel_caracteristicas}}.
Matrícula: {{imovel_matricula}}. Cartório: {{imovel_cartorio}}.
CLÁUSULA SEGUNDA – VISTORIA
O PROMISSÁRIO COMPRADOR declara ter percorrido o imóvel prometido à venda, objeto do presente contrato, estando totalmente ciente das suas características, tamanho, estado de conservação, limites e confrontações.
CLÁUSULA TERCEIRA – PROPRIEDADE E REGULARIDADE
O PROMITENTE VENDEDOR declara, para os devidos fins de direito, que é legítimo proprietário do imóvel objeto deste contrato, e que o referido imóvel se encontra livre e desembaraçado de quaisquer ônus, inclusive penhora, hipoteca, arresto, sequestro ou restrições de qualquer natureza, salvo as ressalvas expressamente indicadas em {{observacoes_especificas}}.
CLÁUSULA QUARTA – ENTREGA DO IMÓVEL
O PROMITENTE VENDEDOR se compromete a entregar o imóvel descrito na CLÁUSULA PRIMEIRA, bem como os bens nele inseridos descritos em {{bens_inclusos}}, livres e desembaraçados de débitos anteriores à transação, tais como energia, água, IPTU, TCR, GRPU/SPU, condomínio, taxas extras e demais encargos.
PARÁGRAFO ÚNICO. O PROMISSÁRIO COMPRADOR se compromete a pagar os encargos e ônus incidentes sobre o imóvel cujo fato gerador seja posterior à posse e transferência de propriedade.
CLÁUSULA QUINTA – VALOR
Pelo presente instrumento, o valor total da presente transação é de {{valor_total}} ({{valor_total_extenso}}).
O PROMITENTE VENDEDOR promete vender ao PROMISSÁRIO COMPRADOR, e este comprar o imóvel, objeto do presente contrato, pelo preço certo e previamente ajustado acima.
CLÁUSULA SEXTA – FORMA DE PAGAMENTO E ENTREGA DAS CHAVES
{{forma_pagamento}}
Os valores serão pagos por meio de {{meio_pagamento}}, conforme dados bancários: {{dados_bancarios_vendedor}}.
A entrega das chaves e a posse direta do imóvel ocorrerão em {{condicao_entrega_chaves}}.
CLÁUSULA SÉTIMA – CORRETAGEM
A responsabilidade da corretagem limita-se à intermediação da negociação de compra e venda do imóvel descrito na CLÁUSULA PRIMEIRA, excluindo-se de si todas e quaisquer obrigações assumidas pelas partes.
O pagamento correspondente ao valor da corretagem deverá ser realizado conforme: {{comissao_descricao}}.
CLÁUSULA OITAVA – ENTREGA DO IMÓVEL
Após o pagamento da parcela final e/ou lavratura da escritura pública, conforme pactuado, o PROMITENTE VENDEDOR desocupará o imóvel, oportunidade em que as partes farão vistoria integral e entrega das chaves ao PROMISSÁRIO COMPRADOR.
CLÁUSULA NONA – IRREVOGABILIDADE, IRRETRATABILIDADE E DESISTÊNCIA
Todos os compromissos assumidos neste contrato são de caráter irrevogável e irretratável, obrigando as partes, seus herdeiros e sucessores a cumprirem o aqui estabelecido.
O não cumprimento de qualquer obrigação constante deste contrato implicará rescisão, independente de aviso, notificação ou interpelação judicial ou extrajudicial, obrigando-se a parte infratora ao pagamento de multa de {{multa_rescisoria}}, além das custas e honorários advocatícios aplicáveis.
CLÁUSULA DÉCIMA – DOCUMENTAÇÃO E TRANSFERÊNCIA
O PROMITENTE VENDEDOR obriga-se a apresentar toda documentação necessária, inclusive certidões negativas pessoais e do imóvel, sem qualquer encargo ou responsabilidade para o PROMISSÁRIO COMPRADOR. O PROMISSÁRIO COMPRADOR compromete-se a encaminhar toda documentação exigida para transferência da titularidade do bem.
CLÁUSULA DÉCIMA PRIMEIRA – FORO
Fica eleito o foro de {{foro}}, renunciando as partes a qualquer outro, por mais privilegiado que seja.
{{cidade}}, {{data_contrato}}.

________________________________________
{{vendedor_nome}}PROMITENTE VENDEDOR
________________________________________
{{comprador_nome}}PROMISSÁRIO COMPRADOR
________________________________________
{{imobiliaria_nome}}INTERMEDIADORA
________________________________________
{{testemunha_1_nome}}TESTEMUNHA
________________________________________
{{testemunha_2_nome}}TESTEMUNHA`,
  },
  compra_venda_area: {
    label: "Compra e venda área",
    templateFileId: "1ljp77cBQZ3_7WEMvPNZ3mHoQ84I7xwjT8h8MIrpAUPo",
    placeholders: [
      "vendedor_qualificacao",
      "comprador_qualificacao",
      "imovel_descricao_juridica",
      "imovel_medidas_confrontacoes",
      "imovel_matricula",
      "imovel_inscricao_municipal",
    ],
    body: `CONTRATO DE COMPROMISSO DE VENDA E COMPRA DE IMÓVEL
QUADRO RESUMO
PROMITENTE VENDEDOR
{{vendedor_qualificacao}}
PROMITENTE COMPRADOR
{{comprador_qualificacao}}
IMÓVEL / ÁREA
{{imovel_descricao_juridica}}
MEDIDAS E CONFRONTAÇÕES
{{imovel_medidas_confrontacoes}}
MATRÍCULA / CADASTRO
{{imovel_matricula}} | {{imovel_inscricao_municipal}}
PREÇO
{{valor_total}} ({{valor_total_extenso}})
FORMA DE PAGAMENTO
{{forma_pagamento}}

CONDIÇÕES
Por este instrumento particular de venda e compra, as partes qualificadas no quadro resumo acima têm entre si justo e contratado o compromisso de venda e compra do imóvel/área descrito, mediante as cláusulas e condições a seguir especificadas.
1 – OBJETO
1.1. O VENDEDOR declara ser legítimo proprietário do imóvel/área assim descrito: {{imovel_descricao_juridica}}, incluindo suas medidas, confrontações, matrícula, cadastro municipal e demais elementos constantes do quadro resumo.
1.2. Medidas e confrontações: {{imovel_medidas_confrontacoes}}.
1.3. Matrícula/cartório/cadastro: {{imovel_matricula}} – {{imovel_cartorio}} – {{imovel_inscricao_municipal}}.
2 – PREÇO
2.1. O preço certo e ajustado da venda ora prometida é de {{valor_total}} ({{valor_total_extenso}}), a ser pago conforme: {{forma_pagamento}}.
3 – INADIMPLEMENTO
3.1. A falta de qualquer pagamento estipulado autorizará o VENDEDOR a considerar rescindido este contrato, sem prejuízo das multas e demais penalidades previstas.
4 – POSSE
4.1. A posse do imóvel/área será transmitida ao COMPRADOR em {{condicao_entrega_posse}}. Até a quitação integral, o COMPRADOR não poderá fazer alteração ou benfeitoria sem anuência expressa do VENDEDOR.
5 – ESCRITURA E REGISTRO
5.1. As despesas com escritura, ITBI, custas, emolumentos e registro serão de responsabilidade de {{responsavel_despesas_escritura}}.
6 – TRIBUTOS E CONDIÇÕES DO IMÓVEL
6.1. A partir de {{data_responsabilidade_encargos}}, correrão por conta de {{responsavel_encargos}} todos os impostos, taxas, contribuições e encargos incidentes sobre o imóvel/área.
7 – IRREVOGABILIDADE E IRRETRATABILIDADE
7.1. O presente contrato é celebrado em caráter irrevogável e irretratável, ressalvado eventual inadimplemento contratual.
8 – RESPONSABILIDADE PELA INTERMEDIAÇÃO
8.1. A responsabilidade da imobiliária {{imobiliaria_nome}} – CRECI {{imobiliaria_creci}}, juntamente com os corretores participantes, limita-se à mediação da presente transação.
8.2. Honorários/corretagem: {{comissao_descricao}}.
9 – DISPOSIÇÕES GERAIS
9.1. As partes elegem o foro de {{foro}} para dirimir quaisquer dúvidas oriundas deste contrato.
9.2. Observações específicas: {{observacoes_especificas}}.
{{cidade}}, {{data_contrato}}.

________________________________________
{{vendedor_nome}}VENDEDOR
________________________________________
{{comprador_nome}}COMPRADOR
________________________________________
{{corretor_nome}}CORRETOR
________________________________________
{{testemunha_1_nome}}TESTEMUNHA
________________________________________
{{testemunha_2_nome}}TESTEMUNHA`,
  },
  compra_venda_permuta: {
    label: "Compra e venda com permuta",
    templateFileId: "1qxqT0A4ddQjZDGZgmsUf_wjwKoks-W_3RcVE-wMOz_k",
    placeholders: [
      "vendedores_qualificacao",
      "comprador_qualificacao",
      "imovel_descricao_juridica",
      "bens_permutados",
      "saldo_em_dinheiro",
      "parcelas_pagamento",
    ],
    body: `CONTRATO PARTICULAR DE COMPRA E VENDA DE IMÓVEL COM PERMUTA
Pelo presente instrumento particular de promessa de compra e venda com permuta, comparecem como partes:
VENDEDORES: {{vendedores_qualificacao}}.
COMPRADOR: {{comprador_qualificacao}}.
As partes acima qualificadas vêm entre si, justo e plenamente acertadas, celebrar a presente compra e venda com permuta, mediante as cláusulas e condições seguintes.
PRIMEIRA – DO IMÓVEL OBJETO DA VENDA
Os VENDEDORES declaram ser legítimos proprietários e possuidores do imóvel assim descrito: {{imovel_descricao_juridica}}.
Matrícula/cartório: {{imovel_matricula}} – {{imovel_cartorio}}.
SEGUNDA – DA PROMESSA DE VENDA
Pelo presente instrumento particular, os VENDEDORES comprometem-se e obrigam-se a vender ao COMPRADOR os direitos sobre a aquisição definitiva do imóvel descrito e caracterizado na cláusula anterior, nas condições de pagamento descritas na cláusula TERCEIRA.
TERCEIRA – DO PREÇO, SINAL E PERMUTA
O preço certo e ajustado pela venda ora contratada é de {{valor_total}} ({{valor_total_extenso}}), que será pago da forma abaixo descrita:
{{bens_permutados}}
Saldo em dinheiro: {{saldo_em_dinheiro}}.
Parcelas e vencimentos: {{parcelas_pagamento}}.
PARÁGRAFO ÚNICO – DAS CONDIÇÕES DOS BENS PERMUTADOS
{{condicoes_bens_permutados}}
QUARTA – VISTORIA E ESTADO DOS IMÓVEIS
O COMPRADOR e os VENDEDORES declaram, neste ato, terem vistoriado os imóveis envolvidos na negociação, estando cientes de seus respectivos estados, metragens, limites, confrontações e condições de ocupação.
QUINTA – REGULARIDADE, ÔNUS E CERTIDÕES
As partes declaram que, salvo ressalvas expressas em {{observacoes_especificas}}, não existem averbações, impedimentos judiciais ou ônus que impeçam a concretização do negócio. As taxas, impostos e contas de consumo deverão estar quitadas conforme acordado entre as partes.
SEXTA – DESPESAS COM ESCRITURA, ITBI E REGISTRO
As despesas com escritura, ITBI, registros, custas e emolumentos relativos aos imóveis envolvidos serão de responsabilidade de {{responsavel_despesas_escritura}}.
SÉTIMA – IRREVOGABILIDADE
O presente instrumento é feito entre as partes contratantes, por si, seus herdeiros e sucessores, em caráter irrevogável e irretratável, obrigando-se estas mesmas partes a manterem o presente negócio sempre bom, firme e valioso.
OITAVA – FORO
Fica eleito o foro de {{foro}}, com exclusão de qualquer outro, por mais privilegiado que seja.
NONA – HONORÁRIOS DE INTERMEDIAÇÃO
As partes comprometem-se a efetuar o pagamento dos honorários pela intermediação ora realizada, conforme: {{comissao_descricao}}.
Divisão de honorários/corretores participantes: {{corretores_participantes}}.
{{cidade}}, {{data_contrato}}.

________________________________________
{{vendedor_1_nome}}VENDEDOR
________________________________________
{{vendedor_2_nome}}VENDEDOR
________________________________________
{{comprador_nome}}COMPRADOR
________________________________________
{{corretor_nome}}CORRETOR
________________________________________
{{testemunha_1_nome}}TESTEMUNHA
________________________________________
{{testemunha_2_nome}}TESTEMUNHA`,
  },
  locacao_residencial: {
    label: "Locação residencial",
    templateFileId: "1ph0S3oFEmbI4CJuwKyPN-gkVkczSYxo46eBrIdFLkqo",
    placeholders: [
      "locador_qualificacao",
      "locatario_qualificacao",
      "imovel_descricao_juridica",
      "prazo_meses",
      "data_inicio",
      "data_fim",
    ],
    body: `INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO RESIDENCIAL
Pelo presente instrumento particular de contrato de locação de imóvel para fins residenciais (“Instrumento”) e na melhor forma de Direito, as partes abaixo qualificadas:
LOCADOR: {{locador_qualificacao}}.
LOCATÁRIO: {{locatario_qualificacao}}.
Doravante designados, individualmente, como “Parte” e, em conjunto, “Partes”, tendo entre si justo e contratado o seguinte:
CONSIDERANDO QUE
(A) O LOCATÁRIO tem interesse em alugar o imóvel abaixo descrito, e o LOCADOR tem interesse em alugá-lo, observados os termos e condições estabelecidos no presente instrumento; e
(B) O LOCADOR, na presente data, é proprietário do imóvel, e o presente compromisso de locação tem por objeto a locação deste.
1. OBJETO
1.1. O objeto do presente instrumento consiste na locação pelo LOCATÁRIO do imóvel de propriedade do LOCADOR, qual seja: {{imovel_descricao_juridica}}.
1.2. Matrícula/cartório: {{imovel_matricula}} – {{imovel_cartorio}}.
2. DA DESTINAÇÃO DO IMÓVEL
2.1. O LOCATÁRIO declara que o imóvel ora locado destina-se única e exclusivamente ao uso {{finalidade_locacao}}.
2.2. O LOCATÁRIO obriga-se a cumprir e fazer cumprir integralmente as disposições legais, condominiais e regulamentares aplicáveis ao imóvel.
3. DO PRAZO DA LOCAÇÃO
3.1. O LOCADOR dá em locação ao LOCATÁRIO o imóvel pelo prazo de {{prazo_meses}} meses, com início em {{data_inicio}} e término em {{data_fim}}.
3.2. {{condicoes_renovacao_rescisao}}
4. DO VALOR DO ALUGUEL
4.1. O aluguel mensal livremente ajustado entre as partes é de {{valor_aluguel}} ({{valor_aluguel_extenso}}).
4.2. O aluguel será reajustado anualmente pelo índice {{indice_reajuste}}, ou outro que venha a substituí-lo, conforme legislação aplicável.
4.3. {{condicoes_aluguel}}
5. DO VENCIMENTO
5.1. O LOCATÁRIO obriga-se a pagar o aluguel mensal até o dia {{dia_vencimento}} de cada mês, por meio de {{meio_pagamento_aluguel}}.
5.2. Após o vencimento, incidirão atualização, juros, multa e demais encargos conforme: {{multa_mora}}.
6. DAS BENFEITORIAS
6.1. O LOCATÁRIO não poderá realizar reformas, adaptações ou benfeitorias sem autorização prévia e por escrito do LOCADOR.
6.2. As benfeitorias autorizadas e suas condições de ressarcimento ou retenção observarão o seguinte: {{condicoes_benfeitorias}}.
7. DOS ENCARGOS
7.1. Correrão por conta do LOCATÁRIO as despesas decorrentes de seu consumo particular, tais como energia elétrica, água, internet e demais encargos descritos em {{encargos_locatario}}.
7.2. IPTU, condomínio e demais taxas serão de responsabilidade de {{responsavel_encargos_locacao}}.
8. DA VISTORIA DO IMÓVEL
8.1. O LOCATÁRIO declara haver vistoriado o imóvel e recebê-lo em estado de conservação compatível com o laudo de vistoria, que poderá integrar este contrato como anexo.
8.2. {{vistoria_observacoes}}
9. DA MULTA
9.1. A infração de qualquer cláusula deste instrumento sujeitará o infrator à multa de {{multa_rescisoria}}, sem prejuízo das perdas e danos eventualmente apurados.
9.2. {{condicoes_multa_rescisao}}
10. DA ENTREGA DAS CHAVES
10.1. Ao término ou rescisão da locação, o LOCATÁRIO restituirá o imóvel livre e desembaraçado de pessoas e coisas, em perfeito estado de conservação e uso, ressalvados os desgastes normais de uso.
11. DOS SINISTROS
11.1. No caso de sinistro que impossibilite a habitação do imóvel, o presente contrato poderá ser rescindido, observadas as responsabilidades legais e contratuais aplicáveis.
12. DA SUBLOCAÇÃO
12.1. É vedado ao LOCATÁRIO sublocar, transferir ou ceder o imóvel, total ou parcialmente, sem autorização prévia e por escrito do LOCADOR.
13. DA GARANTIA LOCATÍCIA
13.1. Como garantia da locação, fica ajustado: {{garantia_tipo}}.
13.2. Valor da caução/garantia: {{caucao_valor}} ({{caucao_valor_extenso}}).
13.3. Dados para depósito ou regras da garantia: {{dados_garantia}}.
14. DAS NOTIFICAÇÕES
14.1. As notificações e comunicações decorrentes deste contrato serão feitas aos endereços físicos ou eletrônicos informados pelas partes, presumindo-se válidas se enviadas aos dados constantes deste instrumento.
15. DA LEGISLAÇÃO APLICÁVEL E LGPD
15.1. Aplicam-se as disposições da Lei nº 8.245/1991 e demais normas aplicáveis.
15.2. As partes comprometem-se a tratar os dados pessoais necessários ao cumprimento deste contrato em conformidade com a legislação de proteção de dados aplicável.
16. DO FORO
16.1. Para eventuais demandas oriundas deste instrumento, elegem as partes o foro de {{foro}}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
{{cidade}}, {{data_contrato}}.

________________________________________
{{locador_nome}}LOCADOR
________________________________________
{{locatario_nome}}LOCATÁRIO
________________________________________
{{testemunha_1_nome}}TESTEMUNHA
________________________________________
{{testemunha_2_nome}}TESTEMUNHA`,
  },
  honorarios_corretagem: {
    label: "Honorários de corretagem",
    templateFileId: "1MHPjcZlmUudiccRmjqX5ccc0U7zr3N_TRhB9coZ9sXE",
    placeholders: [
      "contratante_qualificacao",
      "corretores_participantes",
      "imovel_descricao_juridica",
      "valor_negocio",
      "valor_honorarios",
      "forma_pagamento_honorarios",
    ],
    body: `CONTRATO DE HONORÁRIOS DE CORRETAGEM IMOBILIÁRIA
Pelo presente instrumento particular, de um lado:
CONTRATANTE: {{contratante_qualificacao}}, doravante denominado CONTRATANTE;
E de outro lado:
IMOBILIÁRIA E CORRETOR(ES) DE IMÓVEIS: {{corretores_participantes}}, doravante denominados CORRETOR/IMOBILIÁRIA;
As partes acima qualificadas resolvem celebrar o presente CONTRATO DE HONORÁRIOS DE CORRETAGEM, que será regido pelas cláusulas e condições abaixo.
CLÁUSULA 1 – DO OBJETO
{{objeto}}
Imóvel/negócio objeto da intermediação: {{imovel_descricao_juridica}}.
Matrícula/cartório/cadastro, se aplicável: {{imovel_matricula}} – {{imovel_cartorio}} – {{imovel_inscricao_municipal}}.
CLÁUSULA 2 – DO VALOR DA VENDA / NEGÓCIO
O imóvel ou negócio objeto da intermediação foi negociado pelo valor/base de {{valor_negocio}} ({{valor_negocio_extenso}}), ou conforme condições: {{condicoes_negocio}}.
CLÁUSULA 3 – DOS HONORÁRIOS DE CORRETAGEM
Pelos serviços de intermediação imobiliária prestados, o CONTRATANTE pagará honorários de corretagem no percentual de {{percentual_honorarios}}, correspondentes ao valor de {{valor_honorarios}} ({{valor_honorarios_extenso}}).
CLÁUSULA 4 – DA FORMA DE PAGAMENTO
Os honorários serão pagos na forma seguinte: {{forma_pagamento_honorarios}}.
Parcelas: {{parcelas_honorarios}}.
Dados bancários/Pix: {{dados_bancarios_honorarios}}.
Divisão de honorários entre imobiliárias/corretores participantes: {{divisao_honorarios}}.
CLÁUSULA 5 – DA IRREVOGABILIDADE DOS HONORÁRIOS
Uma vez concretizado o negócio jurídico entre as partes apresentadas pelo CORRETOR/IMOBILIÁRIA, os honorários de corretagem serão devidos integralmente, independentemente de posterior desistência, distrato ou inadimplemento entre comprador e vendedor, conforme previsto nos artigos 722 a 729 do Código Civil Brasileiro.
CLÁUSULA 6 – DA CONFIRMAÇÃO DA INTERMEDIAÇÃO
O CONTRATANTE reconhece que o negócio objeto deste contrato ocorreu em decorrência direta da intermediação realizada pelo CORRETOR/IMOBILIÁRIA, fazendo jus ao recebimento dos honorários estipulados.
CLÁUSULA 7 – DA VIGÊNCIA / EXCLUSIVIDADE
{{vigencia}}
{{exclusividade_condicoes}}
CLÁUSULA 8 – DO FORO
Para dirimir quaisquer dúvidas oriundas deste contrato, as partes elegem o foro de {{foro}}, com renúncia a qualquer outro, por mais privilegiado que seja.
{{cidade}}, {{data_contrato}}.

________________________________________
{{contratante_nome}}CONTRATANTE
________________________________________
{{imobiliaria_nome}}IMOBILIÁRIA/CORRETOR
________________________________________
{{corretor_nome}}CORRETOR
________________________________________
{{testemunha_1_nome}}TESTEMUNHA
________________________________________
{{testemunha_2_nome}}TESTEMUNHA`,
  },
} as const;

export type JuremaContractTemplateKey = keyof typeof JUREMA_CONTRACT_TEMPLATES;

export function getJuremaContractTemplate(templateKey: string | null | undefined) {
  if (!templateKey) return null;
  return JUREMA_CONTRACT_TEMPLATES[templateKey as JuremaContractTemplateKey] ?? null;
}

export function getJuremaContractTemplateOptions() {
  return Object.entries(JUREMA_CONTRACT_TEMPLATES).map(([key, template]) => ({
    key: key as JuremaContractTemplateKey,
    label: template.label,
    templateFileId: template.templateFileId,
    placeholders: [...template.placeholders],
    body: template.body,
  }));
}
