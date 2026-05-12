# YZIHUB: PRD (Product Requirements Document)

## 1. Visão Geral
O YZIHUB é um Sistema Operacional de Growth "AI-First" para imobiliárias de alto ticket. Ele orquestra a jornada do lead desde a captação via WhatsApp (n8n + Agente Luana) até o fechamento, centralizando a gestão no Cockpit do Cliente e no Controle Global (Eric).

## 2. Objetivos Estratégicos
- **Escalabilidade:** Migrar do Airtable para o Supabase para suportar alto volume de requisições.
- **Inteligência:** Refletir os insights da IA (Score, Perfil, Bairro) diretamente no CRM.
- **Eficiência:** Permitir que um Gestor despache leads qualificados para corretores em segundos.

## 3. Personas e Interfaces
- **YZI CONTROL (Admin Eric):** Gestão de Tenants e provisionamento automático (YZI FACTORY).
- **YZI COCKPIT (Gestor Jurema Brokers):** Torre de controle de leads, imóveis e financeiro.
- **Agente AI (Luana/Nina):** Qualificação automática via WhatsApp integrada ao Supabase.

## 4. Requisitos Funcionais (Core Features)
- **CRM Leads:** Tabela editável com Score, Perfil e Bairro (extraídos do RAG).
- **Catálogo de Imóveis:** Grid visual editável com campos técnicos (vagas, suítes, metragem).
- **Gestão Financeira:** Painel de ROI com alertas críticos (⚠️ Atraso, 🔔 Atenção).
- **Action Flow:** Botões que disparam ações no n8n via `job_queue` (QUALIFICAR, ASSINAR).

## 5. Regras de Negócio
- **Isolamento de Tenant:** Um cliente NUNCA deve ver dados de outro.
- **Lei da Variedade Visual:** Dashboard (Gráficos), Leads (Tabela), Pipeline (Kanban).
- **Fluxo de Despacho:** Leads quentes devem ser atribuídos a corretores reais.


## 6. Modelo de Monetização (SaaS Tiers):
- **Básico**: Gestão de CRM e Catálogo.
- **Pro**: Inteligência de Mercado (Radar) e Performance (Tráfego).
- **Growth**: Automação de Conteúdo e Social Media.