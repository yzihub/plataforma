---
phase: quick
plan: 260409-ds4
subsystem: n8n-workflows
tags: [contrato, n8n, mapeamento, airtable, google-docs, jurema-brokers]
dependency_graph:
  requires: []
  provides: [MAP-CONTRATO]
  affects: [contratos-supabase]
tech_stack:
  added: []
  patterns: [webhook-trigger, ai-contract-generation, google-docs-template, airtable-persistence]
key_files:
  created:
    - .planning/quick/260409-ds4-mapear-workflow-de-gera-o-de-contrato-ex/260409-ds4-SUMMARY.md
  modified: []
decisions:
  - "Workflow usa Airtable como fonte de dados primária — migração Supabase exige tabela contracts + campos lead_id/property_id"
  - "Geração do contrato via Google Docs template copy+fill — alternativa futura: PDF direto via API"
  - "Data de Envio hardcoded no Update record Airtable — bug que precisa ser corrigido na migração"
metrics:
  duration: 2 minutes
  completed: 2026-04-09
---

# Quick Task 260409-ds4: Mapeamento do Workflow de Geração de Contrato

**One-liner:** Workflow "Onboarding 2.1 Gerando Contrato" usa Webhook → Airtable → IA (GPT-4o) → Google Docs template → PDF → Gmail + WhatsApp, com persistência exclusiva no Airtable (sem Supabase).

---

## Workflow Identificado

- **ID:** bzK9KbNa5zEYcurj
- **Nome:** Onboarding | 2.1 Gerando Contrato
- **Status:** Inativo (active: false)
- **Criado em:** 2026-02-24
- **Tenant:** Jurema Brokers
- **Total de nodes:** 36 (incluindo sticky notes de documentação)
- **URL:** https://app.yzihub.com/workflow/bzK9KbNa5zEYcurj

---

## Diagrama de Fluxo Textual

```
[ENTRADA]
Webhook (POST /webhook/enviar-contrato)
  |
  v
Get a record (Airtable: GESTÃO DE CONTRATOS)
  via: query.record_id
  |
  v
Code in JavaScript
  Normaliza tipo_contrato: "Intermediação - Venda" → "intermediacao_venda"
                           "Intermediação - Locação" → "intermediacao_locacao"
  |
  v
Switch (por tipo_contrato)
  |-- output:0 intermediacao_venda ----+
  |-- output:1 intermediacao_locacao --+-- (todos vão para Dados do Formulario)
  |-- output:2 intermediacao_outros ---+
  |
  v
Dados do Formulario (Set)
  Mapeia: record_id, id_contrato, endereco, responsavel_followup,
          notas_gestor, tipo_contrato_raw
  |
  v
[GERAÇÃO DO CONTRATO - AI]
Gerador de Contrato (n8n Agent - GPT-4o)
  System: "Advogado especialista em intermediação imobiliária"
  Input: tipo_contrato + endereco + responsavel_followup + notas_gestor
  Output Schema (Structured Output Parser):
    objeto, servicos, payment, vigencia,
    obrigacoes_contratada, obrigacoes_contratante,
    comissao, condicoes_gerais
  |
  v
[PERSISTÊNCIA NO GOOGLE DRIVE]
Copiar Documento Modelo (Google Drive - copy)
  Template: "Template - INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO RESIDENCIAL"
  Doc ID: 1AUeBiFQaFiv9a2STT1tFioxY-2L4CgiY2fpB9-IWe98
  Nome do cópia: "{ID Contrato} - {Documento do Contrato[0].filename}"
  |
  v
Atualizar Permissão (Google Drive - share)
  role: writer, type: anyone (acesso público para leitura/escrita)
  |
  v
Mover Arquivo Para Pasta (Google Drive - move)
  Destino: pasta "CONTRATOS GERADOS" (ID: 1yubpY0qQaqKWEUrEQiY0RtXolSUap6IY)
  |
  v
buscar_dados_lead (Airtable: GESTÃO DE CONTRATOS, by id)
  Busca campos completos: Nome, Email, Telefone, CPF/CNPJ, Endereço...
  |
  v
Dados Formatados (Set)
  Combina: dados do lead (Airtable) + output da IA + ID do Google Doc
  Mapeia placeholders: nomedocliente, cpfcnpj, Endereço, objeto, vigencia,
                       obrigacoes_contratada, obrigacoes_contratante,
                       comissao, condicoes_gerais, data, contratante
  |
  v
Atualizar Documento (Google Docs - replaceAll)
  Substitui placeholders no template copiado:
  {{nomedocliente}}, {{cpfcnpj}}, {{endereco}}, {{objeto}},
  {{servicos}}, {{obrigacoes_contratante}}, {{pagamento}},
  {{condicoes_gerais}}, {{vigencia}}, {{data_contrato}}, {{contratante}}
  |
  v
Download file (Google Drive - download as PDF)
  |
  v
Extract from File (binary to property)
  |
  +---> Formata Texto para Whatsapp (Agent - GPT-4o)   → Enviar documento (Evolution API - WhatsApp)
  |
  +---> Formata Texto para o Email (Agent - GPT-4o-mini) → Converte em Pdf (HTTP GET export)
                                                              |
                                                              v
                                                           Gmail (send email)
                                                              |
                                                              v
                                                           Update record (Airtable)
                                                           Status: "📤 Enviado"
                                                           Documento: url_direta_pdf
                                                           Data de Envio: HARDCODED "2026-02-24T22:22:04"
```

---

## Respostas às 5 Perguntas de Mapeamento

### a) ENTRADA: Qual o trigger? Quais dados recebe?

**Trigger:** Webhook POST em `/webhook/enviar-contrato`

**Payload de entrada mínimo:**
```json
{
  "record_id": "rec...",     // Airtable record ID do contrato
  "id_contrato": "CONTR-001" // ID legível (opcional, lido do Airtable)
}
```

O `record_id` é passado como query param: `$json.query.record_id`

Todos os demais dados (nome do cliente, email, telefone, CPF, endereço, tipo de contrato, notas do gestor) são buscados do Airtable via `record_id`.

---

### b) BUSCA DE DADOS: Busca lead/imóvel de banco ou usa dados mock?

**Fonte de dados: Airtable exclusivamente**

- Base: `appUUDVUQx5JSXXvy` (JUREMA BROKERS)
- Tabela: `tbl9pkKWXvvy291GV` (GESTÃO DE CONTRATOS)

**Campos lidos do Airtable:**
| Campo Airtable | Uso no workflow |
|----------------|-----------------|
| ID Contrato | Nome do arquivo gerado |
| Nome do Cliente (from GESTÃO DE LEADS) | Placeholder {{nomedocliente}} |
| Email do Cliente | Destinatário do Gmail |
| Telefone | Destinatário WhatsApp (Evolution API) |
| CPF / CNPJ | Placeholder {{cpfcnpj}} |
| Endereço | Placeholder {{endereco}} |
| Tipo de Contrato | Roteamento no Switch node |
| Corretor Responsável | Contexto para IA |
| Responsável pelo Follow-up | Passado para Gerador de Contrato |
| ✉️NOTAS DO GESTOR | Prompt principal da IA |
| Documento do Contrato | URL do template existente |
| Status do Contrato | Lido (atualizado para "📤 Enviado") |

**Imóvel:** Não há busca direta de imóvel. O endereço do imóvel está em `Endereço` no registro de contrato do Airtable. Sem JOIN com tabela de imóveis.

---

### c) GERAÇÃO: Como o contrato é gerado?

**Processo em 3 etapas:**

1. **IA Estrutura as Cláusulas (GPT-4o)**
   - Node: `Gerador de Contrato` (n8n Agent)
   - Input: tipo de contrato + endereço + responsável + notas do gestor
   - Output JSON estruturado: `objeto`, `obrigacoes_contratada`, `obrigacoes_contratante`, `comissao`, `condicoes_gerais`, `vigencia`, `servicos`, `payment`
   - Regras: não inventar valores financeiros, não adicionar percentuais sem dados explícitos

2. **Google Docs Template Fill**
   - Copia o template master (Google Doc fixo)
   - Substitui 11 placeholders: `{{nomedocliente}}`, `{{cpfcnpj}}`, `{{endereco}}`, `{{objeto}}`, `{{servicos}}`, `{{obrigacoes_contratante}}`, `{{pagamento}}`, `{{condicoes_gerais}}`, `{{vigencia}}`, `{{data_contrato}}`, `{{contratante}}`
   - O documento preenchido fica no Google Drive pasta "CONTRATOS GERADOS"

3. **Conversão para PDF**
   - Via `https://docs.google.com/feeds/download/documents/export/Export?id=...&exportFormat=pdf`
   - Também disponível via download nativo do Google Drive com conversão para PDF

---

### d) PERSISTÊNCIA: Salva o contrato? Em qual tabela?

**Persistência atual: Airtable apenas**

Node `Update record` atualiza na tabela `GESTÃO DE CONTRATOS`:
| Campo | Valor |
|-------|-------|
| Status do Contrato | "📤 Enviado" |
| Documento do Contrato | `[{ "url": url_direta_pdf }]` (array de attachments) |
| Data de Envio | **HARDCODED** "2026-02-24T22:22:04" — bug crítico |

**O PDF em si não é salvo em banco de dados.** Fica no Google Drive (pasta CONTRATOS GERADOS). O link para o documento no Drive é salvo no Airtable via campo `Documento do Contrato`.

**Sem persistência em Supabase.** Nenhum node do workflow conecta ao Supabase.

---

### e) ENVIO: Envia o contrato para o cliente? Por qual canal?

**Dois canais de envio simultâneos:**

1. **Email via Gmail** (conta "Gmail Jurema")
   - Para: `Email do Cliente` (campo Airtable)
   - Remetente: "Jurema Brokers"
   - Subject e body gerados por IA (GPT-4o-mini): node `Formata Texto para o Email`
   - Attachment: PDF do contrato (via `Converte em Pdf` → arquivo binário)

2. **WhatsApp via Evolution API** (instância "jurema")
   - Para: `Telefone` do cliente
   - Documento enviado como arquivo PDF: `{ID Contrato}.pdf`
   - Caption gerado por IA (GPT-4o): node `Formata Texto para Whatsapp`
   - Media: binário do PDF (base64)

---

## Nodes Mapeados (Ordem de Execução)

| # | Node | Tipo | Função |
|---|------|------|--------|
| 1 | Webhook | webhook | Trigger via POST /webhook/enviar-contrato |
| 2 | Get a record | airtable | Busca contrato pelo record_id |
| 3 | Code in JavaScript | code | Normaliza tipo_contrato, formata datas |
| 4 | Switch | switch | Roteia por tipo (venda/locação/outros) |
| 5 | Dados do Formulario | set | Mapeia campos para o fluxo |
| 6 | Gerador de Contrato | agent (GPT-4o) | Estrutura cláusulas jurídicas |
| 7 | Structured Output Parser | outputParserStructured | Valida output JSON da IA |
| 8 | Copiar Documento Modelo | googleDrive | Copia template Google Doc |
| 9 | Atualizar Permissão | googleDrive | Torna arquivo público |
| 10 | Mover Arquivo Para Pasta | googleDrive | Move para pasta CONTRATOS GERADOS |
| 11 | buscar_dados_lead | airtable | Busca dados completos do cliente |
| 12 | Dados Formatados | set | Monta todos os placeholders |
| 13 | Atualizar Documento | googleDocs | Preenche template com dados reais |
| 14 | Download file | googleDrive | Baixa como PDF |
| 15 | Extract from File | extractFromFile | Converte binário para uso |
| 16a | Formata Texto para Whatsapp | agent (GPT-4o) | Gera mensagem WhatsApp |
| 17a | Enviar documento | evolutionApi | Envia PDF via WhatsApp |
| 16b | Formata Texto para o Email | agent (GPT-4o-mini) | Gera subject+body email |
| 17b | Converte em Pdf | httpRequest | Export PDF via Google Feeds |
| 18 | Gmail | gmail | Envia email com PDF |
| 19 | Update record | airtable | Atualiza status e URL do PDF no Airtable |

---

## Gap Analysis: O Que Falta para Integração com Supabase

### Gap 1: Tabela `contracts` não existe no Supabase

**Situação atual:** Toda persistência de contratos está no Airtable (`GESTÃO DE CONTRATOS`).

**Tabela necessária no Supabase:**
```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id),
  property_id UUID REFERENCES properties(id),
  contract_number TEXT,                    -- "ID Contrato" do Airtable
  type TEXT,                               -- intermediacao_venda | intermediacao_locacao | administracao
  status TEXT DEFAULT 'draft',             -- draft | sent | signed | cancelled
  google_doc_id TEXT,                      -- ID do documento no Google Drive
  google_doc_url TEXT,                     -- URL direta do PDF
  pdf_url TEXT,                            -- URL pública do PDF
  generated_by_ai BOOLEAN DEFAULT true,
  ai_clauses JSONB,                        -- Output da IA: objeto, vigencia, comissao, etc
  notes TEXT,                              -- "NOTAS DO GESTOR"
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Gap 2: Campo `lead_id` ausente no fluxo atual

**Situação atual:** O workflow busca contrato por `record_id` do Airtable. Não há vinculação direta com um `lead_id` no Supabase.

**O que precisa mudar:** O webhook deve receber `lead_id` (UUID Supabase) e/ou `contract_id`. O workflow precisa buscar dados do lead na tabela `leads` do Supabase em vez do Airtable.

---

### Gap 3: Campo `property_id` ausente — endereço hardcoded

**Situação atual:** O imóvel é referenciado apenas como texto (`Endereço`) no campo do Airtable. Não há JOIN com tabela de imóveis.

**O que precisa mudar:** O contrato deveria referenciar `property_id` da tabela `properties` no Supabase. Isso permite puxar todos os dados do imóvel (endereço completo, área, registro, matrícula) para o contrato.

---

### Gap 4: Bug crítico — Data de Envio hardcoded

**Situação atual:** Node `Update record` tem `Data de Envio` hardcoded como `"2026-02-24T22:22:04"` — data de desenvolvimento.

**Correção necessária:** Usar `={{ new Date().toISOString() }}` ou `={{ $now }}`.

---

### Gap 5: Permissão pública no Google Drive (risco de segurança)

**Situação atual:** Node `Atualizar Permissão` define `type: anyone, role: writer` — o documento fica EDITÁVEL por qualquer pessoa com o link.

**Correção necessária:** Mudar para `role: reader` (somente leitura) para documentos enviados a clientes.

---

### Gap 6: Nenhum tratamento de erro

**Situação atual:** Sem nodes de Error Trigger ou ramificações de fallback. Se qualquer step falhar (IA, Google Drive, Gmail), o workflow para silenciosamente.

**O que adicionar:** Error Trigger global + notificação ao gestor (ex: WhatsApp para número interno).

---

### Gap 7: Structured Output Parser inconsistente com Gerador de Contrato

**Situação atual:** `Structured Output Parser` (ligado ao Gerador de Contrato) tem schema básico:
```json
{ "objetive", "servicos", "payment", "vigencia" }
```
Mas `Dados Formatados` usa campos mais ricos: `obrigacoes_contratada`, `obrigacoes_contratante`, `comissao`, `condicoes_gerais`, `objeto`.

**Risco:** Se o GPT-4o não retornar os campos esperados por `Dados Formatados`, os placeholders ficam vazios no Google Doc.

---

## Resumo Executivo dos Gaps

| # | Gap | Criticidade | Tipo |
|---|-----|-------------|------|
| 1 | Tabela `contracts` inexistente no Supabase | ALTA | Nova tabela |
| 2 | `lead_id` não vinculado | ALTA | Novo campo + novo fluxo de busca |
| 3 | `property_id` não referenciado | MÉDIA | Novo campo |
| 4 | Data de Envio hardcoded | ALTA | Bug fix |
| 5 | Permissão Google Drive pública writável | ALTA | Segurança |
| 6 | Sem tratamento de erro | MÉDIA | Resiliência |
| 7 | Schema IA inconsistente | MÉDIA | Qualidade de dados |

---

## Dados Usados no Airtable (para migração para Supabase)

**Tabela Airtable:** `GESTÃO DE CONTRATOS` (base JUREMA BROKERS)

Campos que precisam de equivalente no Supabase:
- `ID Contrato` → `contract_number`
- `Status do Contrato` → `status`
- `Tipo de Contrato` → `type`
- `Endereço` → via `property_id` → `properties.address`
- `Corretor Responsável` → `agent_name` (ou via user_id)
- `Responsável pelo Follow-up` → mesmo que Corretor (campo separado no Airtable)
- `✉️NOTAS DO GESTOR` → `notes`
- `Documento do Contrato` → `pdf_url` + `google_doc_url`
- `Data de Envio` → `sent_at`
- `Nome do Cliente` (from GESTÃO DE LEADS) → via `lead_id` → `leads.name`
- `Email do Cliente` → via `lead_id` → `leads.email`
- `Telefone` → via `lead_id` → `leads.phone`
- `CPF / CNPJ` → via `lead_id` → `leads.document`
- `STATUS CALCULADO DO CONTRATO` → campo calculado ou view SQL

---

## Deviations from Plan

None — plan executed exactly as written. Read-only mapping task via n8n REST API. No files were modified in the project.

## Self-Check: PASSED

- SUMMARY.md created at correct path
- No project files were modified
- 5 mapping questions answered (entrada, busca, geração, persistência, envio)
- Gap analysis for Supabase migration documented
- Zero code changes made
