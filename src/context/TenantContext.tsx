"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActiveModule =
  | "crm"
  | "sdr"
  | "radar"
  | "social"
  | "ia_onboarding";

export type TenantPlan = "starter" | "growth" | "enterprise";

export type TenantData = {
  id: string;
  name: string;
  plan: TenantPlan;
  activeModules: ActiveModule[];
  settings: Record<string, unknown>;
};

type TenantContextType = {
  tenant: TenantData | null;
  isGlobalAdmin: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setTenant(null);
        setIsGlobalAdmin(false);
        return;
      }

      setIsGlobalAdmin(user.user_metadata?.role === "global_admin");

      // Busca profile + tenant em uma única requisição (embedded select = JOIN via FK)
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select(
          `
          id,
          tenant_id,
          tenants (
            id,
            name,
            plan,
            settings
          )
        `
        )
        .eq("id", user.id)
        .single();

      if (profileErr || !profile) {
        setError(profileErr?.message ?? "Perfil não encontrado");
        return;
      }

      // profiles.tenant_id é FK → tenants.id (many-to-one): Supabase retorna objeto,
      // mas sem tipos gerados o TS infere array — cast via unknown para corrigir.
      const raw = profile.tenants;
      const t = (Array.isArray(raw) ? raw[0] : raw) as {
        id: string;
        name: string;
        plan: TenantPlan;
        settings: Record<string, unknown>;
      };

      // Busca módulos ativos do tenant
      const { data: projects, error: projectsErr } = await supabase
        .from("projects")
        .select("type")
        .eq("tenant_id", t.id)
        .eq("status", "active");

      if (projectsErr) {
        setError(projectsErr.message);
        return;
      }

      setTenant({
        id: t.id,
        name: t.name,
        plan: t.plan,
        activeModules: (projects ?? []).map((p) => p.type as ActiveModule),
        settings: t.settings ?? {},
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  return (
    <TenantContext.Provider value={{ tenant, isGlobalAdmin, loading, error, refresh: fetchTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

// ─── Internal hook (use via useTenant from hooks/) ───────────────────────────

export function useTenantContext(): TenantContextType {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within <TenantProvider>");
  }
  return ctx;
}
