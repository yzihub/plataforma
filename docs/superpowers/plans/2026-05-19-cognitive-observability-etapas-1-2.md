# Cognitive Observability Cockpit — Etapas 1+2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `/cockpit/observabilidade` from a basic metrics viewer into a live cognitive operational tower — CognitiveHealthStrip (6 sinais de saúde, 24h), DriftAlert condicional, and CognitiveFeedTable (20 execuções recentes com navegação causal). Institutional semantic language throughout: "Estado cognitivo", "Objetivo ativo", "Latência cognitiva", "Recuo de fallback".

**Architecture:** Two new API routes (`/api/observabilidade/health` + `/api/observabilidade/feed`) query `ju_runtime_traces` server-side using `createAdminClient` with the same dev-bypass pattern as the existing `/api/observabilidade/agent-metrics`. Six atomic badge components handle semantic rendering. Three composition components (`CognitiveHealthStrip`, `DriftAlert`, `CognitiveFeedTable`) are `"use client"` and fetch their data independently. The page is a simple Server Component that assembles the tower.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS (TailAdmin pattern), Supabase (`createAdminClient`), `"use client"` + `useEffect` fetch, `force-dynamic` API routes.

**Spec:** `docs/superpowers/specs/2026-05-19-cognitive-observability-cockpit-design.md`

---

## File Map

**Create:**

| File | Purpose |
|------|---------|
| `src/lib/cockpit/types.ts` | `CognitiveSeverity`, `CognitiveHealthData`, `CognitiveFeedRow` |
| `src/lib/cockpit/severity.ts` | `computeCognitiveSeverity()` pure function |
| `src/app/api/observabilidade/health/route.ts` | GET — 24h aggregates from `ju_runtime_traces` |
| `src/app/api/observabilidade/feed/route.ts` | GET — 20 recent traces with severity computed server-side |
| `src/components/cockpit/CognitiveSeverityBadge.tsx` | critical / warning / nominal / info pill |
| `src/components/cockpit/StateTransitionBadge.tsx` | `prev → current` mono arrow |
| `src/components/cockpit/ObjectiveStateBadge.tsx` | objective violet pill |
| `src/components/cockpit/LatencyBadge.tsx` | green / amber / red latency number |
| `src/components/cockpit/RetrievalPolicyBadge.tsx` | disabled / lazy / required label |
| `src/components/cockpit/ConversationAnchor.tsx` | blue link → `/sessoes/[id]` |
| `src/components/cockpit/SkeletonHealthStrip.tsx` | pulse skeleton for health strip |
| `src/components/cockpit/SkeletonFeedRows.tsx` | pulse skeleton for feed rows |
| `src/components/cockpit/CognitiveHealthStrip.tsx` | KPI row — 6 health signals |
| `src/components/cockpit/DriftAlert.tsx` | conditional orange anomaly banner |
| `src/components/cockpit/CognitiveFeedTable.tsx` | feed table with badges and anchors |

**Modify:**

| File | Change |
|------|--------|
| `src/app/cockpit/observabilidade/page.tsx` | Replace `AgentMetricsClient` with tower composition |

---

## Task 1: Shared types and severity utility

**Files:**
- Create: `src/lib/cockpit/types.ts`
- Create: `src/lib/cockpit/severity.ts`

- [ ] **Step 1.1: Create `src/lib/cockpit/types.ts`**

```ts
export type CognitiveSeverity = "critical" | "warning" | "nominal" | "info";

export interface CognitiveHealthData {
  total_traces: number;
  loops_detectados: number;
  fallbacks: number;
  erros: number;
  transicoes_irregulares: number;
  latencia_media_ms: number | null;
  latencia_maxima_ms: number | null;
  recuperacoes_ativas: number;
  conversas_ativas: number;
  generated_at: string;
}

export interface CognitiveFeedRow {
  runtime_trace_id: string;
  correlation_id: string;
  conversation_id: string | null;
  lead_id: string | null;
  deal_id: string | null;
  runtime_state: string | null;
  previous_runtime_state: string | null;
  objective_state: string | null;
  next_action: string | null;
  loop_risk: string | null;
  loop_detected: boolean;
  fallback_triggered: boolean;
  retrieval_policy: string | null;
  retrieval_allowed: boolean | null;
  valid_transition: boolean | null;
  latency_ms: number | null;
  status: string;
  created_at: string;
  severity: CognitiveSeverity;
}
```

- [ ] **Step 1.2: Create `src/lib/cockpit/severity.ts`**

```ts
import type { CognitiveSeverity } from "./types";

interface SeverityInput {
  loop_detected: boolean;
  loop_risk: string | null;
  valid_transition: boolean | null;
  fallback_triggered: boolean;
  retrieval_allowed: boolean | null;
}

export function computeCognitiveSeverity(t: SeverityInput): CognitiveSeverity {
  if (t.loop_detected || (t.loop_risk === "high" && t.valid_transition === false)) {
    return "critical";
  }
  if (t.loop_risk === "medium" || t.fallback_triggered || t.valid_transition === false) {
    return "warning";
  }
  if (t.retrieval_allowed === true) {
    return "info";
  }
  return "nominal";
}
```

- [ ] **Step 1.3: Verify severity logic manually**

Reading the function, confirm these 5 cases:

| Input | Expected |
|-------|---------|
| `loop_detected: true` | `"critical"` |
| `loop_risk: "high"`, `valid_transition: false`, `loop_detected: false` | `"critical"` |
| `fallback_triggered: true`, `loop_detected: false`, `loop_risk: null` | `"warning"` |
| `loop_detected: false`, `loop_risk: null`, `valid_transition: true`, `fallback_triggered: false`, `retrieval_allowed: true` | `"info"` |
| `loop_detected: false`, `loop_risk: null`, `valid_transition: true`, `fallback_triggered: false`, `retrieval_allowed: null` | `"nominal"` |

- [ ] **Step 1.4: Commit**

```bash
rtk git add src/lib/cockpit/types.ts src/lib/cockpit/severity.ts
rtk git commit -m "feat(cockpit): add cognitive types and severity utility"
```

---

## Task 2: API route — health

**File:** Create `src/app/api/observabilidade/health/route.ts`

- [ ] **Step 2.1: Create the route**

```ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CognitiveHealthData } from "@/lib/cockpit/types";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    let tenantId: string;

    if (isDevBypass) {
      tenantId = DEV_JUREMA_TENANT_ID;
    } else {
      const { createClient } = await import("@/lib/supabase/server");
      const anonClient = await createClient();
      const {
        data: { user },
        error: authError,
      } = await anonClient.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (profileError || !profile?.tenant_id) {
        return NextResponse.json(
          { error: "Perfil nao encontrado" },
          { status: 401 }
        );
      }
      tenantId = profile.tenant_id as string;
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: traces, error } = await supabase
      .from("ju_runtime_traces")
      .select(
        "conversation_id, loop_detected, fallback_triggered, status, valid_transition, retrieval_allowed, latency_ms"
      )
      .eq("tenant_id", tenantId)
      .gte("created_at", since24h);

    if (error) {
      console.error("[GET /api/observabilidade/health]", error);
      return NextResponse.json(
        { error: "Erro ao buscar traces" },
        { status: 500 }
      );
    }

    const rows = traces ?? [];

    const conversas_ativas = new Set(
      rows.map((r) => r.conversation_id).filter(Boolean)
    ).size;
    const loops_detectados = rows.filter((r) => r.loop_detected === true).length;
    const fallbacks = rows.filter((r) => r.fallback_triggered === true).length;
    const erros = rows.filter((r) => r.status === "error").length;
    const transicoes_irregulares = rows.filter(
      (r) => r.valid_transition === false
    ).length;
    const recuperacoes_ativas = rows.filter(
      (r) => r.retrieval_allowed === true
    ).length;

    const latencies = rows
      .map((r) => r.latency_ms)
      .filter((ms): ms is number => ms !== null && typeof ms === "number");

    const latencia_media_ms =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null;
    const latencia_maxima_ms =
      latencies.length > 0 ? Math.max(...latencies) : null;

    const payload: CognitiveHealthData = {
      total_traces: rows.length,
      loops_detectados,
      fallbacks,
      erros,
      transicoes_irregulares,
      latencia_media_ms,
      latencia_maxima_ms,
      recuperacoes_ativas,
      conversas_ativas,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[GET /api/observabilidade/health]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2.2: Verify with curl**

With `npm run dev` running:

```bash
curl -s http://localhost:3000/api/observabilidade/health | jq .
```

Expected shape (values will vary):
```json
{
  "total_traces": 0,
  "loops_detectados": 0,
  "fallbacks": 0,
  "erros": 0,
  "transicoes_irregulares": 0,
  "latencia_media_ms": null,
  "latencia_maxima_ms": null,
  "recuperacoes_ativas": 0,
  "conversas_ativas": 0,
  "generated_at": "2026-05-19T..."
}
```

Must return HTTP 200 and contain all 10 keys.

- [ ] **Step 2.3: Commit**

```bash
rtk git add src/app/api/observabilidade/health/route.ts
rtk git commit -m "feat(cockpit): add GET /api/observabilidade/health route"
```

---

## Task 3: API route — feed

**File:** Create `src/app/api/observabilidade/feed/route.ts`

- [ ] **Step 3.1: Create the route**

```ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCognitiveSeverity } from "@/lib/cockpit/severity";
import type { CognitiveFeedRow } from "@/lib/cockpit/types";

const DEV_JUREMA_TENANT_ID = "82cc7aa9-fc6e-4f37-8d8e-8a71c1691361";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    let tenantId: string;

    if (isDevBypass) {
      tenantId = DEV_JUREMA_TENANT_ID;
    } else {
      const { createClient } = await import("@/lib/supabase/server");
      const anonClient = await createClient();
      const {
        data: { user },
        error: authError,
      } = await anonClient.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (profileError || !profile?.tenant_id) {
        return NextResponse.json(
          { error: "Perfil nao encontrado" },
          { status: 401 }
        );
      }
      tenantId = profile.tenant_id as string;
    }

    const { data: traces, error } = await supabase
      .from("ju_runtime_traces")
      .select(
        `runtime_trace_id, correlation_id, conversation_id,
         lead_id, deal_id,
         runtime_state, previous_runtime_state,
         objective_state, next_action,
         loop_risk, loop_detected, fallback_triggered,
         retrieval_policy, retrieval_allowed, valid_transition,
         latency_ms, status, created_at`
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[GET /api/observabilidade/feed]", error);
      return NextResponse.json(
        { error: "Erro ao buscar feed" },
        { status: 500 }
      );
    }

    const rows: CognitiveFeedRow[] = (traces ?? []).map((t) => ({
      runtime_trace_id: t.runtime_trace_id,
      correlation_id: t.correlation_id,
      conversation_id: t.conversation_id ?? null,
      lead_id: t.lead_id ?? null,
      deal_id: t.deal_id ?? null,
      runtime_state: t.runtime_state ?? null,
      previous_runtime_state: t.previous_runtime_state ?? null,
      objective_state: t.objective_state ?? null,
      next_action: t.next_action ?? null,
      loop_risk: t.loop_risk ?? null,
      loop_detected: t.loop_detected ?? false,
      fallback_triggered: t.fallback_triggered ?? false,
      retrieval_policy: t.retrieval_policy ?? null,
      retrieval_allowed: t.retrieval_allowed ?? null,
      valid_transition: t.valid_transition ?? null,
      latency_ms: t.latency_ms ?? null,
      status: t.status ?? "ok",
      created_at: t.created_at,
      severity: computeCognitiveSeverity({
        loop_detected: t.loop_detected ?? false,
        loop_risk: t.loop_risk ?? null,
        valid_transition: t.valid_transition ?? null,
        fallback_triggered: t.fallback_triggered ?? false,
        retrieval_allowed: t.retrieval_allowed ?? null,
      }),
    }));

    return NextResponse.json({ rows }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/observabilidade/feed]", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3.2: Verify with curl**

```bash
curl -s http://localhost:3000/api/observabilidade/feed | jq '{count: (.rows | length), first: .rows[0]}'
```

Expected: HTTP 200, `rows` is an array. Each item contains `severity` (one of `"critical"/"warning"/"nominal"/"info"`).

- [ ] **Step 3.3: Commit**

```bash
rtk git add src/app/api/observabilidade/feed/route.ts
rtk git commit -m "feat(cockpit): add GET /api/observabilidade/feed route"
```

---

## Task 4: Atomic badge components

**Files:** Create 6 atomic components in `src/components/cockpit/`

These are pure presentational components — no `"use client"` needed.

- [ ] **Step 4.1: Create `src/components/cockpit/CognitiveSeverityBadge.tsx`**

```tsx
import type { CognitiveSeverity } from "@/lib/cockpit/types";

const CONFIG: Record<CognitiveSeverity, { label: string; className: string }> = {
  critical: {
    label: "Crítico",
    className:
      "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  },
  warning: {
    label: "Atenção",
    className:
      "bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  },
  nominal: {
    label: "Normal",
    className:
      "bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  },
  info: {
    label: "Info",
    className:
      "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  },
};

export default function CognitiveSeverityBadge({
  severity,
}: {
  severity: CognitiveSeverity;
}) {
  const { label, className } = CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 4.2: Create `src/components/cockpit/StateTransitionBadge.tsx`**

```tsx
interface Props {
  from: string | null;
  to: string | null;
}

export default function StateTransitionBadge({ from, to }: Props) {
  const prev = from ?? "—";
  const curr = to ?? "—";
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs">
      <span className="text-gray-400 dark:text-gray-500">{prev}</span>
      <span className="text-gray-300 dark:text-gray-600">→</span>
      <span className="font-medium text-gray-800 dark:text-gray-200">{curr}</span>
    </span>
  );
}
```

- [ ] **Step 4.3: Create `src/components/cockpit/ObjectiveStateBadge.tsx`**

```tsx
export default function ObjectiveStateBadge({
  objective,
}: {
  objective: string | null;
}) {
  if (!objective)
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
    );
  return (
    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300">
      {objective}
    </span>
  );
}
```

- [ ] **Step 4.4: Create `src/components/cockpit/LatencyBadge.tsx`**

```tsx
export default function LatencyBadge({ ms }: { ms: number | null }) {
  if (ms === null)
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
    );

  const className =
    ms < 400
      ? "text-emerald-600 dark:text-emerald-400"
      : ms < 800
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <span className={`font-mono text-xs font-medium ${className}`}>{ms}ms</span>
  );
}
```

- [ ] **Step 4.5: Create `src/components/cockpit/RetrievalPolicyBadge.tsx`**

```tsx
const POLICY: Record<string, { label: string; className: string }> = {
  disabled: { label: "desativada", className: "text-gray-500 dark:text-gray-400" },
  lazy:     { label: "lazy",       className: "text-blue-600 dark:text-blue-400" },
  required: { label: "obrigatória",className: "text-violet-600 dark:text-violet-400" },
};

export default function RetrievalPolicyBadge({
  policy,
}: {
  policy: string | null;
}) {
  if (!policy)
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
    );

  const cfg = POLICY[policy] ?? {
    label: policy,
    className: "text-gray-600 dark:text-gray-300",
  };
  return (
    <span className={`text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
  );
}
```

- [ ] **Step 4.6: Create `src/components/cockpit/ConversationAnchor.tsx`**

```tsx
import Link from "next/link";

export default function ConversationAnchor({
  conversationId,
}: {
  conversationId: string | null;
}) {
  if (!conversationId)
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
    );

  const short = conversationId.slice(0, 8) + "…";

  return (
    <Link
      href={`/cockpit/observabilidade/sessoes/${conversationId}`}
      className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
      title={conversationId}
    >
      {short}
    </Link>
  );
}
```

- [ ] **Step 4.7: Commit**

```bash
rtk git add src/components/cockpit/
rtk git commit -m "feat(cockpit): add 6 atomic cognitive badge components"
```

---

## Task 5: Skeleton components

**Files:**
- Create: `src/components/cockpit/SkeletonHealthStrip.tsx`
- Create: `src/components/cockpit/SkeletonFeedRows.tsx`

- [ ] **Step 5.1: Create `src/components/cockpit/SkeletonHealthStrip.tsx`**

```tsx
export default function SkeletonHealthStrip() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5.2: Create `src/components/cockpit/SkeletonFeedRows.tsx`**

```tsx
export default function SkeletonFeedRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-5 w-14 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-36 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="ml-auto h-4 w-14 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5.3: Commit**

```bash
rtk git add src/components/cockpit/SkeletonHealthStrip.tsx src/components/cockpit/SkeletonFeedRows.tsx
rtk git commit -m "feat(cockpit): add skeleton loading components"
```

---

## Task 6: CognitiveHealthStrip

**File:** Create `src/components/cockpit/CognitiveHealthStrip.tsx`

- [ ] **Step 6.1: Create the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { CognitiveHealthData } from "@/lib/cockpit/types";
import SkeletonHealthStrip from "./SkeletonHealthStrip";

interface KpiConfig {
  key: keyof CognitiveHealthData;
  label: string;
  accent: string;
  unit?: string;
}

const STRIP: KpiConfig[] = [
  {
    key: "conversas_ativas",
    label: "Sessões Ativas",
    accent: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "loops_detectados",
    label: "Loops Cognitivos",
    accent: "text-red-600 dark:text-red-400",
  },
  {
    key: "fallbacks",
    label: "Recuos de Fallback",
    accent: "text-orange-600 dark:text-orange-400",
  },
  {
    key: "erros",
    label: "Erros de Execução",
    accent: "text-red-500 dark:text-red-400",
  },
  {
    key: "latencia_media_ms",
    label: "Latência Cognitiva",
    accent: "text-gray-700 dark:text-gray-300",
    unit: "ms",
  },
  {
    key: "recuperacoes_ativas",
    label: "Rec. de Memória",
    accent: "text-violet-600 dark:text-violet-400",
  },
];

export default function CognitiveHealthStrip() {
  const [data, setData] = useState<CognitiveHealthData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/observabilidade/health")
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((d: CognitiveHealthData) => setData(d))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Sinais de saúde cognitiva indisponíveis.
      </div>
    );
  }

  if (!data) return <SkeletonHealthStrip />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {STRIP.map(({ key, label, accent, unit }) => {
        const raw = data[key];
        const display =
          raw === null || raw === undefined
            ? "—"
            : unit
              ? `${raw}${unit}`
              : String(raw);
        return (
          <div
            key={key}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`mt-1 text-xl font-bold ${accent}`}>{display}</p>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6.2: Commit**

```bash
rtk git add src/components/cockpit/CognitiveHealthStrip.tsx
rtk git commit -m "feat(cockpit): add CognitiveHealthStrip component"
```

---

## Task 7: DriftAlert

**File:** Create `src/components/cockpit/DriftAlert.tsx`

- [ ] **Step 7.1: Create the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { CognitiveHealthData } from "@/lib/cockpit/types";

export default function DriftAlert() {
  const [data, setData] = useState<CognitiveHealthData | null>(null);

  useEffect(() => {
    fetch("/api/observabilidade/health")
      .then((r) => r.json())
      .then((d: CognitiveHealthData) => setData(d))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const hasAnomaly =
    data.loops_detectados > 0 || data.fallbacks > 0 || data.erros > 0;

  if (!hasAnomaly) return null;

  const parts: string[] = [];
  if (data.loops_detectados > 0) {
    const n = data.loops_detectados;
    parts.push(`${n} loop${n > 1 ? "s" : ""} cognitivo${n > 1 ? "s" : ""}`);
  }
  if (data.fallbacks > 0) {
    const n = data.fallbacks;
    parts.push(`${n} recuo${n > 1 ? "s" : ""} de fallback`);
  }
  if (data.erros > 0) {
    const n = data.erros;
    parts.push(`${n} erro${n > 1 ? "s" : ""} de execução`);
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
      <span className="mt-0.5 text-lg leading-none text-orange-500">⚠</span>
      <div>
        <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
          Anomalia cognitiva detectada nas últimas 24h
        </p>
        <p className="mt-0.5 text-xs text-orange-600 dark:text-orange-400">
          {parts.join(" · ")}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7.2: Commit**

```bash
rtk git add src/components/cockpit/DriftAlert.tsx
rtk git commit -m "feat(cockpit): add DriftAlert conditional anomaly banner"
```

---

## Task 8: CognitiveFeedTable

**File:** Create `src/components/cockpit/CognitiveFeedTable.tsx`

- [ ] **Step 8.1: Create the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { CognitiveFeedRow } from "@/lib/cockpit/types";
import CognitiveSeverityBadge from "./CognitiveSeverityBadge";
import StateTransitionBadge from "./StateTransitionBadge";
import ObjectiveStateBadge from "./ObjectiveStateBadge";
import LatencyBadge from "./LatencyBadge";
import ConversationAnchor from "./ConversationAnchor";
import SkeletonFeedRows from "./SkeletonFeedRows";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export default function CognitiveFeedTable() {
  const [rows, setRows] = useState<CognitiveFeedRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/observabilidade/feed")
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((d: { rows: CognitiveFeedRow[] }) =>
        setRows(Array.isArray(d.rows) ? d.rows : [])
      )
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Feed de execuções cognitivas indisponível.
      </div>
    );
  }

  if (!rows) return <SkeletonFeedRows rows={8} />;

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nenhuma execução cognitiva registrada ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Severidade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Estado cognitivo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Objetivo ativo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Latência
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Sessão
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Quando
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {rows.map((row) => (
              <tr
                key={row.runtime_trace_id}
                className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-3">
                  <CognitiveSeverityBadge severity={row.severity} />
                </td>
                <td className="px-4 py-3">
                  <StateTransitionBadge
                    from={row.previous_runtime_state}
                    to={row.runtime_state}
                  />
                </td>
                <td className="px-4 py-3">
                  <ObjectiveStateBadge objective={row.objective_state} />
                </td>
                <td className="px-4 py-3">
                  <LatencyBadge ms={row.latency_ms} />
                </td>
                <td className="px-4 py-3">
                  <ConversationAnchor conversationId={row.conversation_id} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                  {relativeTime(row.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 8.2: Commit**

```bash
rtk git add src/components/cockpit/CognitiveFeedTable.tsx
rtk git commit -m "feat(cockpit): add CognitiveFeedTable with semantic badges"
```

---

## Task 9: Page composition — Torre Cognitiva

**File:** Modify `src/app/cockpit/observabilidade/page.tsx`

- [ ] **Step 9.1: Replace page content**

Replace the entire file `src/app/cockpit/observabilidade/page.tsx` with:

```tsx
import DriftAlert from "@/components/cockpit/DriftAlert";
import CognitiveHealthStrip from "@/components/cockpit/CognitiveHealthStrip";
import CognitiveFeedTable from "@/components/cockpit/CognitiveFeedTable";

export const dynamic = "force-dynamic";

export default function ObservabilidadePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Torre Cognitiva
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Estado operacional da Ju · últimas 24h
        </p>
      </div>

      <DriftAlert />
      <CognitiveHealthStrip />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Execuções recentes
        </h2>
        <CognitiveFeedTable />
      </div>
    </div>
  );
}
```

- [ ] **Step 9.2: TypeScript check**

```bash
rtk tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 9.3: Manual browser verification**

With `npm run dev` running, open `http://localhost:3000/cockpit/observabilidade`.

Verify this checklist:

| # | What to check | Pass condition |
|---|---------------|----------------|
| 1 | Título | "Torre Cognitiva" visível |
| 2 | Subtítulo | "Estado operacional da Ju · últimas 24h" |
| 3 | Skeleton HealthStrip | 6 retângulos pulsando brevemente |
| 4 | HealthStrip carregado | 6 cards: Sessões Ativas, Loops Cognitivos, Recuos de Fallback, Erros de Execução, Latência Cognitiva, Rec. de Memória |
| 5 | DriftAlert ausente | Sem banner laranja se não há anomalia |
| 6 | FeedTable skeleton | Linhas pulsando brevemente |
| 7 | FeedTable carregado | Tabela com colunas: Severidade, Estado cognitivo, Objetivo ativo, Latência, Sessão, Quando |
| 8 | Severity badge | Pill colorida (verde=Normal, laranja=Atenção, vermelho=Crítico, azul=Info) |
| 9 | StateTransition | Fonte mono `prev → atual` |
| 10 | ConversationAnchor | Link azul 8-char se conversation_id existe |

- [ ] **Step 9.4: Smoke test DriftAlert**

To verify DriftAlert renders when anomalies exist, in `src/app/api/observabilidade/health/route.ts`, immediately before the final `return NextResponse.json(payload)`, temporarily add:

```ts
// TEMP visual test — remove after verifying
payload.loops_detectados = 2;
```

Reload the page. Verify:
- Orange banner appears with "Anomalia cognitiva detectada nas últimas 24h"
- Text reads "2 loops cognitivos"

Remove the temporary line. Reload. Banner disappears. ✓

- [ ] **Step 9.5: Final commit**

```bash
rtk git add src/app/cockpit/observabilidade/page.tsx
rtk git commit -m "feat(cockpit): activate torre cognitiva — Etapas 1+2 live"
```

---

## Self-Review

**Spec coverage:**
- ✅ Etapa 1: Landing health + `CognitiveHealthStrip` + `DriftAlert`
- ✅ Etapa 2: `CognitiveFeedTable` (feed recente com navegação)
- ✅ Todos os 6 badges atômicos do spec §8.3: `CognitiveSeverityBadge`, `StateTransitionBadge`, `ObjectiveStateBadge`, `LatencyBadge`, `RetrievalPolicyBadge`, `ConversationAnchor`
- ✅ Skeletons: `SkeletonHealthStrip`, `SkeletonFeedRows`
- ✅ Queries do spec §6.1 (health) e §6.2 (feed) — implementadas via JS aggregation server-side
- ✅ Auth pattern: mesmo dev-bypass do `/api/observabilidade/agent-metrics`
- ✅ Linguagem semântica: "Estado cognitivo", "Objetivo ativo", "Latência cognitiva", "Recuos de Fallback", "Loops Cognitivos", "Rec. de Memória"
- ✅ `ConversationAnchor` aponta para `/cockpit/observabilidade/sessoes/[id]` (Etapa 3 futura) — não é beco sem saída
- ✅ Severity computado em spec §2.3: critical / warning / nominal / info com condições exatas

**Placeholder scan:** Nenhum. Todos os steps têm código ou comandos concretos.

**Type consistency:**
- `CognitiveHealthData` definido em Task 1, usado em Tasks 2, 6, 7 — shape idêntico
- `CognitiveFeedRow` definido em Task 1, usado em Tasks 3, 8 — shape idêntico
- `computeCognitiveSeverity()` definido em Task 1, importado em Task 3 — mesmo nome
- Props de todos os componentes batem com os tipos definidos
