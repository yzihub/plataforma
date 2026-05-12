# 📊 YZIHUB - Data Mapping

## 📌 Regras Gerais

* Usar snake_case
* Nunca inventar campos
* Baseado nos CSVs reais
* Tipos bem definidos

---

## 🧠 Leads

Campos principais:

* nome_cliente
* telefone
* status_lead
* score_lead
* corretor_responsavel
* faixa_valor
* origem
* ultima_interacao

UI:

* table → listagem
* kanban → pipeline
* badge → status

---

## 🏠 Imóveis

Campos:

* id_imovel
* tipo_imovel
* valor
* bairro
* quartos
* suites
* vagas
* metragem
* status_publicacao

UI:

* images → foto
* table → listagem
* badge → status

---

## 💰 Financeiro

Campos:

* id_financeiro
* tipo_registro
* valor_previsto
* valor_realizado
* status_financeiro
* categoria
* data_pagamento

UI:

* table → registros
* charts → gráficos
* badge → status

---

## 📄 Contratos

Campos:

* id_contrato
* nome_cliente
* email_cliente
* telefone
* tipo_contrato
* status_contrato
* imovel_relacionado
* corretor_responsavel
* data_envio
* data_assinatura
* dias_sem_retorno

UI:

* table → controle
* modal → criação
* alert → atrasos
* badge → status

---

## 🔗 Relações

* Lead → Contrato
* Imóvel → Contrato
* Lead → Financeiro
* Corretor → tudo

---

## ⚠️ Regras Críticas

* Status sempre visual (badge)
* Datas com filtro
* Valores formatados (R$)
* Nenhum campo vazio

---
