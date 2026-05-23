# Ju Semantic Real Estate Taxonomy

Documento canônico da camada institucional de inteligência semântica imobiliária da Ju, derivado do arquivo `descrição.txt` da operação Jurema Brokers em João Pessoa/PB.

Esta taxonomia não cria runtime, microserviço, embeddings ou pipeline realtime. Ela organiza conhecimento institucional para reduzir interpretação bruta pelo LLM e orientar parser, ranking, retrieval e linguagem consultiva.

## 1. Fonte Analisada

Arquivo analisado:

`d:\YZIHUB\CLAUDE\JUREMA BROKERS\descrição.txt`

Volume:

- 30 descrições reais de imóveis.
- Mercado dominante: João Pessoa/PB e litoral urbano próximo, com presença de Cabedelo/Intermares/Areia Dourada.
- Bairros recorrentes: Tambaú, Manaíra, Bessa, Jardim Oceania, Cabo Branco, Altiplano, Aeroclube, Intermares, Bairro dos Estados.

Sinais quantitativos encontrados:

- `projetado/mobiliado`: 12 ocorrências cada.
- `nascente sul`, `posição nascente`, `posição sul`: 22 ocorrências combinadas.
- `DCE`: 7 ocorrências.
- `lazer completa`: 7 ocorrências.
- `investimento`: 8 ocorrências.
- `porteira fechada`: 6 ocorrências.
- `beira-mar`: 6 ocorrências.
- `temporada`: 3 ocorrências.
- `coworking/home office`: 4 ocorrências combinadas.

## 2. Leitura Estratégica

As descrições não são apenas copy comercial. Elas carregam:

- Sinais técnicos regionais, como posição solar, DCE e projetados.
- Sinais emocionais, como privilégio, acolhimento, tranquilidade e status.
- Sinais de decisão, como pronto para morar, rentabilidade, moradia familiar ou uso por temporada.
- Sinais urbanos, como walkability, serviços próximos, shopping, mini mercado e proximidade da praia.
- Sinais de produto, como flat, studio, casa em condomínio, apartamento amplo e porteira fechada.

O erro arquitetural a evitar é mandar essa descrição inteira para o GPT e esperar que o modelo faça parsing imobiliário bruto. A camada correta é:

```text
descricao_imovel
-> taxonomia semântica institucional
-> parser operacional
-> features estruturadas
-> ranking contextual
-> payload mínimo para GPT
```

## 3. Categorias Semânticas

### 3.1 Lifestyle Praia

Sinais:

- praia
- poucos metros do mar
- beira-mar
- frente mar
- pé-na-areia
- vista mar
- brisa do oceano
- orla
- Cabo Branco, Tambaú, Bessa, Jardim Oceania, Manaíra, Intermares

Significado:

Vida costeira, rotina leve, desejo aspiracional de morar ou investir perto do mar.

Impacto emocional:

Qualidade de vida, privilégio, contemplação, liberdade, valorização.

Perfis associados:

- lifestyle praia
- veraneio
- investidor de temporada
- aposentadoria
- alto padrão

### 3.2 Urbano Prático

Sinais:

- serviços próximos
- comércio
- restaurantes
- shopping
- mini mercado
- lavanderia compartilhada
- fácil acesso
- localização estratégica
- ponto estratégico

Significado:

O imóvel reduz fricção da rotina. O comprador compra tempo, mobilidade e conveniência.

Impacto emocional:

Praticidade, controle da rotina, segurança de escolha.

Perfis associados:

- casal jovem
- primeira moradia
- investidor
- home office
- profissional solteiro

### 3.3 Família e Rotina

Sinais:

- 3 ou 4 quartos
- múltiplas suítes
- DCE
- área kids
- brinquedoteca
- escola/colégio
- piscina
- quintal
- condomínio fechado
- sala ampla
- vagas múltiplas

Significado:

Imóvel preparado para rotina familiar, privacidade, apoio doméstico e convivência.

Impacto emocional:

Segurança, acolhimento, estabilidade, amplitude e conforto.

Perfis associados:

- família
- casal com filhos
- família alto padrão
- mudança de padrão

### 3.4 Resort/Condomínio Clube

Sinais:

- lazer completo
- piscina
- sauna
- academia
- salão de festas
- espaço gourmet
- quadras
- spa
- kids club
- sky lounge

Significado:

O condomínio vira extensão do lazer privado. A pessoa compra moradia e experiência.

Impacto emocional:

Bem-estar, status, convivência, comodidade e sensação de resort.

Perfis associados:

- família
- alto padrão
- aposentadoria
- veraneio

### 3.5 Investimento e Rentabilidade

Sinais:

- investimento
- rentabilidade
- temporada
- diária
- retorno acima da média
- valorização
- flat
- studio
- mobiliado
- porteira fechada

Significado:

Produto com tese de retorno financeiro, liquidez de locação e baixa fricção de operação.

Impacto emocional:

Segurança financeira, oportunidade, liquidez e renda passiva.

Perfis associados:

- investidor
- investidor de temporada
- comprador de segunda unidade
- comprador de fora

### 3.6 Pronto Para Morar

Sinais:

- porteira fechada
- totalmente mobiliado
- semi-mobiliado
- projetado
- planejado
- equipado
- pronto para morar
- móveis sob medida

Significado:

Reduz custo inicial, tempo de implantação e insegurança de mudança.

Impacto emocional:

Comodidade, praticidade, segurança e decisão mais fácil.

Perfis associados:

- casal jovem
- investidor
- comprador de fora
- veraneio
- primeira moradia

### 3.7 Home Office e Vida Moderna

Sinais:

- coworking
- sala de reunião
- sala de estudos
- escritório
- home office
- quarto reversível
- planta funcional
- cozinha integrada

Significado:

Moradia adaptada à rotina híbrida, trabalho remoto e uso flexível dos ambientes.

Impacto emocional:

Autonomia, produtividade, modernidade e flexibilidade.

Perfis associados:

- home office
- profissional liberal
- casal jovem
- investidor long stay

## 4. Sinais Regionais

### Nascente Sul

Contexto regional:

Em João Pessoa, conforto térmico é critério forte. `Nascente sul` comunica ventilação constante, luz natural mais confortável e ambientes mais frescos.

Significado:

- ventilação
- conforto térmico
- bem-estar diário
- diferencial técnico local

Impacto de valor:

Alto para comprador local experiente. Médio/alto para famílias e alto padrão.

### Posição Sul

Contexto regional:

Sinal de clima mais ameno e menor desconforto solar.

Significado:

- ambiente mais agradável
- menor dependência de ar-condicionado
- conforto cotidiano

Impacto de valor:

Médio/alto. Deve entrar como `comfort_score`.

### DCE

Contexto regional:

Em plantas maiores, DCE indica imóvel tradicional, amplo e versátil.

Significado:

- apoio doméstico
- quarto reversível
- home office
- depósito
- espaço multiuso

Impacto de valor:

Alto para família e plantas amplas. Médio para investidor.

### Varanda Gourmet

Contexto regional:

Sinal de vida social doméstica e extensão da sala.

Significado:

- convivência
- lazer privado
- receber amigos
- integração social

Impacto de valor:

Alto para família, casal jovem e alto padrão.

### Beira-Mar / Frente Mar / Vista Definitiva

Contexto regional:

O litoral é ativo emocional e financeiro. Vista permanente é escassez.

Significado:

- exclusividade
- contemplação
- valorização
- desejo aspiracional

Impacto de valor:

Muito alto. Deve elevar `beach_score`, `luxury_score` e `investment_score`.

### Pé-na-Areia

Contexto regional:

Grau máximo de proximidade física com a praia.

Significado:

- raridade
- uso de lazer imediato
- produto turístico
- apelo para temporada

Impacto de valor:

Muito alto para veraneio e investimento.

### Porteira Fechada

Contexto regional:

Facilita compra por investidor, comprador de fora ou quem quer uso imediato.

Significado:

- produto pronto
- menor CAPEX inicial
- ocupação rápida
- rentabilização mais simples

Impacto de valor:

Alto em imóveis compactos, flats, studios e praia.

### Projetados / Planejados

Contexto regional:

Marcenaria sob medida é percebida como economia, organização e acabamento.

Significado:

- aproveitamento de espaço
- praticidade
- bom gosto
- valor agregado

Impacto de valor:

Médio/alto, principalmente em compactos, primeira moradia e imóveis prontos.

## 5. Semântica Urbana Por Bairro

### Tambaú

Leitura:

Bairro de desejo consolidado, vida urbana costeira, turismo, serviços, liquidez e alta conveniência.

Sinais:

- coração de Tambaú
- poucos metros do mar
- shopping
- restaurantes
- serviços
- valorização

Como a Ju deve interpretar:

Tambaú não é apenas praia. É praia com infraestrutura urbana e liquidez.

### Manaíra

Leitura:

Bairro valorizado, urbano, com infraestrutura forte e apelo de vista mar em produtos específicos.

Sinais:

- área valorizada
- serviços
- vista definitiva
- praticidade
- conforto

Como a Ju deve interpretar:

Manaíra combina conveniência urbana com potencial de valorização.

### Bessa

Leitura:

Litoral residencial em crescimento, com mistura de moradia, praia, investimento e casas familiares.

Sinais:

- beira-mar
- praia do Bessa
- casa
- flat
- studios
- temporada

Como a Ju deve interpretar:

Bessa tem leitura dupla: casa/família e investimento/lifestyle praia.

### Jardim Oceania

Leitura:

Zona costeira com qualidade de vida, proximidade da praia e estrutura residencial.

Sinais:

- Argemiro de Figueiredo
- pé-na-areia
- acesso direto à praia
- lazer
- projetados

Como a Ju deve interpretar:

Jardim Oceania deve ser tratado como praia com rotina residencial, não apenas produto turístico.

### Cabo Branco

Leitura:

Endereço aspiracional de praia, valorização e escassez de bons produtos perto do mar.

Sinais:

- 50m da praia
- 55m da praia
- Bar do Cuscuz
- vista definitiva
- potencial de rentabilidade

Como a Ju deve interpretar:

Cabo Branco pede linguagem de privilégio, valorização e escassez.

### Altiplano

Leitura:

Bairro nobre, verticalizado, com status, exclusividade e condomínios com conceito resort.

Sinais:

- nobre
- valorizado
- exclusividade
- resort
- porteira fechada
- lazer completo

Como a Ju deve interpretar:

Altiplano conversa com alto padrão, família e status funcional.

### Aeroclube

Leitura:

Bairro estratégico e prático, bom para moradia funcional e investimento.

Sinais:

- fácil acesso
- serviços
- valorização
- coworking
- conveniência

Como a Ju deve interpretar:

Aeroclube é argumento de mobilidade, preço relativo e praticidade.

## 6. Buyer Profiles Identificados

### Família

Busca:

Espaço, segurança, quartos, lazer, rotina confortável e estabilidade.

Sinais fortes:

3 quartos, suítes, DCE, brinquedoteca, área kids, escolas, piscina, condomínio fechado, sala ampla.

Como conduzir:

Conectar o imóvel à rotina da família, sem transformar a resposta em ficha técnica.

### Investidor

Busca:

Liquidez, rentabilidade, valorização e facilidade de operação.

Sinais fortes:

Flat, studio, mobiliado, porteira fechada, temporada, diária, praia, retorno acima da média.

Como conduzir:

Falar de potencial e liquidez sem prometer rentabilidade não validada.

### Veraneio / Lifestyle Praia

Busca:

Uso emocional, descanso, praia e qualidade de vida.

Sinais fortes:

Beira-mar, pé-na-areia, vista mar, poucos metros da praia, piscina, mobiliado.

Como conduzir:

Usar linguagem de rotina e experiência, não apenas localização.

### Alto Padrão

Busca:

Exclusividade, acabamento, privacidade, conforto superior e endereço valorizado.

Sinais fortes:

Alto padrão, vista definitiva, suítes, 2 vagas, lazer resort, Altiplano, nascente sul.

Como conduzir:

Tom calmo, seguro e consultivo. Evitar pressão comercial.

### Casal Jovem / Primeira Moradia

Busca:

Praticidade, localização, imóvel pronto, condomínio útil e custo controlado.

Sinais fortes:

2 quartos, mobiliado, projetado, mini mercado, lavanderia, academia, coworking.

Como conduzir:

Destacar rotina prática e baixa fricção de mudança.

### Home Office

Busca:

Flexibilidade, silêncio funcional, estudo/trabalho e conveniência.

Sinais fortes:

Coworking, sala de reunião, sala de estudos, escritório, quarto reversível, home office.

Como conduzir:

Tratar infraestrutura de trabalho como diferencial real, não amenidade secundária.

### Aposentadoria

Busca:

Tranquilidade, conforto térmico, praia, serviços e segurança.

Sinais fortes:

Beira-mar, posição sul, elevador, serviços próximos, portaria, lazer, andar baixo.

Como conduzir:

Valorizar rotina confortável, segurança e leveza.

## 7. Emotional Signals

### Conforto

Sinais:

Nascente sul, posição sul, ventilação, iluminação natural, suítes, sala ampla, planta bem distribuída.

Interpretação:

O comprador quer sentir que a rotina será leve e agradável.

### Exclusividade

Sinais:

Vista definitiva, beira-mar, pé-na-areia, Altiplano, poucos metros da praia, depósito privativo, solário.

Interpretação:

O comprador percebe raridade e diferenciação social/patrimonial.

### Sofisticação

Sinais:

Alto padrão, porcelanato, iluminação, marcenaria, projetados, varanda gourmet, acabamento sofisticado.

Interpretação:

O comprador busca bom gosto e valor percebido acima do básico.

### Praticidade

Sinais:

Porteira fechada, mobiliado, mini mercado, lavanderia, shopping, serviços próximos, pronto para morar.

Interpretação:

O comprador quer reduzir esforço, tempo e custo de implantação.

### Acolhimento

Sinais:

Sala para ambientes, varanda, área gourmet, quintal, cozinha integrada, receber amigos, família.

Interpretação:

O imóvel é percebido como lugar de convivência e pertencimento.

### Segurança

Sinais:

Portaria 24h, câmeras, guarita, condomínio fechado, garagem coberta, bairro consolidado.

Interpretação:

Segurança física e segurança de decisão imobiliária.

### Valorização

Sinais:

Bairro desejado, área valorizada, praia, vista mar, localização estratégica, investimento, rentabilidade.

Interpretação:

O imóvel é percebido como ativo, não só moradia.

## 8. Mapeamento Para Features Operacionais

Features recomendadas para parser/ranking futuro:

```json
{
  "regional_signals": [],
  "lifestyle": [],
  "buyer_profiles": [],
  "emotional_signals": [],
  "luxury_score": 0,
  "family_score": 0,
  "beach_score": 0,
  "investment_score": 0,
  "convenience_score": 0,
  "comfort_score": 0,
  "urban_score": 0,
  "remote_work_score": 0
}
```

Exemplo:

```json
{
  "regional_signals": ["nascente_sul", "porteira_fechada", "projetados"],
  "lifestyle": ["praia", "pronto_para_morar", "urbano_pratico"],
  "buyer_profiles": ["casal_jovem", "investidor", "lifestyle_praia"],
  "emotional_signals": ["praticidade", "conforto", "valorizacao"],
  "luxury_score": 2,
  "family_score": 1,
  "beach_score": 4,
  "investment_score": 3,
  "convenience_score": 5,
  "comfort_score": 4,
  "urban_score": 3,
  "remote_work_score": 0
}
```

## 9. Regras Para Ju

Ao conversar:

- Não repetir ficha técnica quando o parser já estruturou o imóvel.
- Não usar descrição bruta como texto final.
- Não transformar imóveis em lista fria.
- Conectar uma ou duas razões contextuais ao perfil do cliente.
- Preservar URL e cards vindos de `consultar_imoveis`.
- Usar linguagem curta, humana e consultiva.

Exemplo de uso correto:

```text
Esse faz sentido pelo que você comentou porque já vem pronto, fica perto da praia e tem posição sul, que em João Pessoa pesa bastante no conforto do dia a dia.
```

## 10. Próximos Passos Arquiteturais

Sem criar runtime novo, os próximos passos pragmáticos são:

1. Expandir o parser JS de `consultar_imoveis` para usar esta taxonomia como referência estática.
2. Adicionar `regional_signals`, `buyer_profiles`, `emotional_signals`, `comfort_score`, `convenience_score` e `urban_score` ao payload mínimo.
3. Criar fixtures de imóveis reais por perfil comprador.
4. Medir redução de tokens quando o GPT recebe apenas `operational_summary`, sinais e scores.
5. No futuro, usar o XML como fonte para chunking semântico ou Supabase Vector, sem colocar a descrição bruta no hot-path.

## 11. Contrato Canônico

O XML institucional correspondente está em:

`docs/knowledge/ju-real-estate-semantic-intelligence.xml`

Ele deve ser tratado como fonte de conhecimento institucional para semântica imobiliária regional da Ju.
