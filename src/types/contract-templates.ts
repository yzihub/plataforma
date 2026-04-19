// ─── Contract Templates — Catalogo de modelos de contrato ─────────────────────
// Cada template tem um body com placeholders {{var}} substituíveis por dados reais.
// Texto jurídico-base editável — ponto de partida para o corretor revisar.

export interface ContractTemplate {
  id: string;
  label: string;
  type: "venda" | "locacao" | "servico" | "parceria";
  body: string;
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "compra_venda_padrao",
    label: "Compra e Venda — Padrão",
    type: "venda",
    body: `CONTRATO PARTICULAR DE COMPRA E VENDA DE IMÓVEL

Data: {{data}}

PARTES:

VENDEDOR: [Nome do Vendedor], doravante denominado VENDEDOR.

COMPRADOR: {{comprador}}, doravante denominado COMPRADOR.

IMÓVEL:

O VENDEDOR é legítimo proprietário do imóvel denominado {{imovel}}, localizado conforme descrito na matrícula do imóvel junto ao Cartório de Registro de Imóveis competente.

DO PREÇO:

O COMPRADOR adquire o referido imóvel pelo preço global de R$ {{valor}} ({{valor_extenso}}), a ser pago conforme as condições estabelecidas entre as partes.

DA COMISSÃO:

A corretagem é devida ao corretor responsável {{corretor}}, no valor de R$ {{comissao}}, correspondente a 5% (cinco por cento) do valor total da transação, nos termos da Lei 6.530/78.

DAS OBRIGAÇÕES DO VENDEDOR:

1. Entregar o imóvel nas condições pactuadas;
2. Providenciar toda a documentação necessária para a transferência;
3. Garantir a posse mansa e pacífica do imóvel.

DAS OBRIGAÇÕES DO COMPRADOR:

1. Efetuar os pagamentos nos prazos convencionados;
2. Assumir todos os ônus e encargos do imóvel a partir da data de entrega;
3. Arcar com as despesas de transferência e registro.

DAS DISPOSIÇÕES GERAIS:

As partes elegem o Foro da Comarca onde está situado o imóvel para dirimir quaisquer dúvidas decorrentes deste contrato, renunciando a qualquer outro, por mais privilegiado que seja.

E por estarem assim justos e contratados, assinam o presente instrumento em duas vias de igual teor e forma.


__________________________________
VENDEDOR


__________________________________
COMPRADOR: {{comprador}}


__________________________________
CORRETOR: {{corretor}}
CRECI: [Número do CRECI]


__________________________________
TESTEMUNHA 1: _____________________


__________________________________
TESTEMUNHA 2: _____________________
`,
  },
  {
    id: "locacao",
    label: "Locação Residencial",
    type: "locacao",
    body: `CONTRATO DE LOCAÇÃO RESIDENCIAL

Data: {{data}}

PARTES:

LOCADOR: [Nome do Proprietário/Locador], doravante denominado LOCADOR.

LOCATÁRIO: {{comprador}}, doravante denominado LOCATÁRIO.

DO OBJETO:

O LOCADOR cede ao LOCATÁRIO, para uso residencial, o imóvel {{imovel}}, nas condições e pelo prazo estabelecidos neste instrumento.

DO PRAZO:

A locação terá prazo de 30 (trinta) meses, podendo ser renovada por acordo entre as partes.

DO ALUGUEL:

O aluguel mensal é de R$ {{valor}}, devendo ser pago até o dia [dia] de cada mês subsequente ao vencido, via transferência bancária ou boleto.

DA COMISSÃO DE CORRETAGEM:

A intermediação da locação foi realizada pelo corretor {{corretor}}, a quem é devida comissão de R$ {{comissao}} (5% do valor total da locação no período), paga pelo LOCADOR.

DAS OBRIGAÇÕES DO LOCADOR:

1. Entregar o imóvel em condições de habitabilidade;
2. Manter a posse pacífica do imóvel durante o contrato;
3. Realizar reparos estruturais necessários.

DAS OBRIGAÇÕES DO LOCATÁRIO:

1. Pagar o aluguel pontualmente;
2. Usar o imóvel exclusivamente para fins residenciais;
3. Devolver o imóvel no estado em que foi recebido;
4. Não sublocar ou ceder o imóvel sem autorização.

DAS GARANTIAS:

[Modalidade de garantia: fiador, caução, seguro-fiança, etc.]

DAS DISPOSIÇÕES GERAIS:

Este contrato rege-se pela Lei nº 8.245/91 (Lei do Inquilinato) e pelo Código Civil Brasileiro.


__________________________________
LOCADOR


__________________________________
LOCATÁRIO: {{comprador}}


__________________________________
CORRETOR INTERMEDIADOR: {{corretor}}
CRECI: [Número do CRECI]


__________________________________
TESTEMUNHA 1: _____________________


__________________________________
TESTEMUNHA 2: _____________________
`,
  },
  {
    id: "exclusividade",
    label: "Exclusividade de Venda",
    type: "servico",
    body: `CONTRATO DE EXCLUSIVIDADE DE INTERMEDIAÇÃO IMOBILIÁRIA

Data: {{data}}

PARTES:

PROPRIETÁRIO: {{comprador}}, doravante denominado PROPRIETÁRIO.

CORRETOR EXCLUSIVO: {{corretor}}, inscrito no CRECI sob o nº [Número], doravante denominado CORRETOR.

DO OBJETO:

O PROPRIETÁRIO outorga ao CORRETOR a exclusividade para intermediar a venda/locação do imóvel {{imovel}}, pelo prazo e condições estabelecidos neste instrumento.

DO PRAZO:

A exclusividade terá vigência de [prazo], podendo ser renovada por acordo escrito entre as partes.

DO PREÇO DE OFERTA:

O imóvel será ofertado pelo valor de R$ {{valor}}, ficando autorizado ao CORRETOR negociar até [percentual]% de desconto sem nova autorização do PROPRIETÁRIO.

DA COMISSÃO:

Em caso de conclusão da transação durante o período de exclusividade, será devida ao CORRETOR comissão de 5% (cinco por cento) sobre o valor efetivo da transação, estimada em R$ {{comissao}} para o valor de oferta atual.

DAS OBRIGAÇÕES DO CORRETOR:

1. Divulgar o imóvel nos principais portais imobiliários e redes sociais;
2. Realizar visitas acompanhadas com potenciais compradores/locatários;
3. Apresentar relatório mensal de atividades ao PROPRIETÁRIO;
4. Conduzir as negociações com diligência e boa-fé.

DAS OBRIGAÇÕES DO PROPRIETÁRIO:

1. Não negociar diretamente com interessados captados pelo CORRETOR;
2. Fornecer ao CORRETOR a documentação completa do imóvel;
3. Permitir acesso ao imóvel para visitas agendadas;
4. Manter o imóvel em boas condições para visitação.

DA RESCISÃO:

O contrato poderá ser rescindido por qualquer das partes, mediante aviso prévio de 30 dias. Em caso de rescisão pelo PROPRIETÁRIO sem justa causa, serão devidas as despesas comprovadas pelo CORRETOR.

DAS DISPOSIÇÕES GERAIS:

Este contrato rege-se pelo Código Civil Brasileiro e pela Lei 6.530/78 (Lei do Corretor de Imóveis).


__________________________________
PROPRIETÁRIO: {{comprador}}


__________________________________
CORRETOR EXCLUSIVO: {{corretor}}
CRECI: [Número do CRECI]


__________________________________
TESTEMUNHA 1: _____________________


__________________________________
TESTEMUNHA 2: _____________________
`,
  },
];
