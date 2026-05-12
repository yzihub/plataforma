# 🤖 AUTOMATIONS - YZIHUB

## 🧠 VISÃO GERAL

Este documento define todas as automações do sistema YZIHUB.

Cada automação segue o padrão:

evento → condição → ação → resultado

---

## 🧩 LEADS

### 🟢 Lead Criado

evento:

* lead.created

ação:

* send_followup
* calculate_score

resultado:

* lead recebe contato automático
* score inicial definido

---

### 🟡 Lead Atualizado

evento:

* lead.updated

ação:

* recalculate_score

resultado:

* score atualizado com base nos novos dados

---

### 🔵 Mudança de Estágio

evento:

* lead.stage_changed

condições:

* se stage = "qualified"

ação:

* notify_user

resultado:

* corretor recebe notificação

---

### 🔴 Lead virou Contrato

evento:

* lead.stage_changed

condições:

* se stage = "contract"

ação:

* create_contract

resultado:

* contrato criado automaticamente

---

## 📄 CONTRATOS

### 🟢 Contrato Criado

evento:

* contract.created

ação:

* notify_user

resultado:

* corretor informado

---

### 🟡 Contrato Enviado

evento:

* contract.sent

ação:

* start_timer

resultado:

* inicia contagem para acompanhamento

---

### 🔴 Contrato sem assinatura

evento:

* contract.sent

condições:

* se 7 dias sem assinatura

ação:

* send_reminder
* create_alert

resultado:

* cliente recebe lembrete
* sistema gera alerta

---

### 🟣 Contrato Assinado

evento:

* contract.signed

ação:

* update_lead_status
* notify_user

resultado:

* lead marcado como "won"
* corretor informado

---

## ⚙️ JOBS / SISTEMA

### 🔁 Job Criado

evento:

* job.created

ação:

* enqueue_job

---

### ✅ Job Finalizado

evento:

* job.completed

ação:

* log_success

---

### ❌ Job Falhou

evento:

* job.failed

ação:

* retry_job
* log_error

condições:

* attempts < max_attempts

---

## 🔗 REGRAS GERAIS

* Toda automação deve nascer de um evento
* Nenhuma ação deve rodar diretamente no webhook
* Todas ações devem gerar log em action_logs
* Todas ações devem passar pela job_queue
* Sempre usar tenant_id

---

## 🧠 PRIORIDADES

1. lead.created → follow-up imediato
2. lead.stage_changed → automação de vendas
3. contract.sent → acompanhamento
4. contract.signed → fechamento

---

## 🚀 OBJETIVO

Criar um sistema que:

* automatiza vendas
* reduz trabalho manual
* aumenta conversão
* escala operação

---
