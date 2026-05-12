# 🧠 YZIHUB - Architecture

## 📌 Visão Geral

O YZIHUB é um sistema SaaS para gestão imobiliária e tráfego pago, focado em performance, organização e automação.

---

## 🧱 Stack

### Frontend

* Next.js (App Router)
* Tailwind CSS
* TailAdmin (customizado)

### Backend

* Supabase (Auth, Database, Storage)

### Infra

* Vercel (deploy)

---

## 🏗️ Estrutura do Sistema

```
/src
  /app
    /cockpit
      /leads
      /imoveis
      /financeiro
      /contratos

  /components
    /ui (design system)
    /yzihub (componentes do produto)

  /lib
    /services
    /utils

  /contexts
    TenantContext
```

---

## 🧠 Multi-Tenant

* Cada usuário pertence a um tenant
* Exemplo atual: Jurema Brokers
* Filtro global via TenantContext

---

## 🔐 Autenticação

* Supabase Auth
* Profiles vinculados ao tenant_id
* Roles:

  * owner
  * corretor
  * admin

---

## 🔄 Fluxo de Dados

1. UI solicita dados
2. Service layer processa
3. Supabase responde
4. UI renderiza

---

## 🎯 Princípios

* Componentização forte
* Separação UI / lógica
* Escalável
* Código limpo

---
