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

      console.log("[DIAG] REMOVE AFTER VALIDATION — getUser result:", user?.id ?? "no user"); // [DIAG] REMOVE AFTER VALIDATION

      const isDevBypass =
        process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

      // 🚨 proteção: nunca permitir bypass em produção
      if (process.env.NODE_ENV === "production" && isDevBypass) {
        throw new Error("DEV_BYPASS ATIVO EM PRODUÇÃO ❌");
      }

      if (!user) {
        // DEV_BYPASS controlado
        if (isDevBypass) {
          // DEV fallback: tenant real da Jurema — somente NODE_ENV=development
          setTenant({
            id: "b179ae75-3d56-4de8-8840-fc9c4d9ec21e",
            name: "Jurema Brokers (DEV)",
            plan: "growth",
            activeModules: ["crm", "sdr", "ia_onboarding"],
            settings: { agent_name: "Luana", primary_color: "#465FFF" },
          });
          setIsGlobalAdmin(false);
          setLoading(false);
          return;
        }

        setTenant(null);
        setIsGlobalAdmin(false);
        setLoading(false); // prevent infinite loading when no session
        return;
      }

      setIsGlobalAdmin(user.user_metadata?.role === "global_admin");

      // ─── PROFILE + TENANT (JOIN) ─────────────────────────────

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

      console.log("[DIAG] REMOVE AFTER VALIDATION — profiles query result:", profileErr?.message ?? `tenant_id=${profile?.tenant_id}`); // [DIAG] REMOVE AFTER VALIDATION

      if (profileErr || !profile) {
        console.error("[TenantContext] profiles error:", {
          message: profileErr?.message,
          details: (profileErr as unknown as { details?: string })?.details,
          hint: (profileErr as unknown as { hint?: string })?.hint,
        });
        setError(profileErr?.message ?? "Perfil não encontrado");
        return;
      }

      if (!profile.tenants) {
        setError("Tenant não encontrado");
        return;
      }

      const tenantData = Array.isArray(profile.tenants)
        ? profile.tenants[0]
        : profile.tenants;

      if (!tenantData) {
        setError("Tenant inválido");
        return;
      }

      console.log("[DIAG] REMOVE AFTER VALIDATION — tenant resolved:", { id: tenantData.id, name: tenantData.name, plan: tenantData.plan }); // [DIAG] REMOVE AFTER VALIDATION

      // ─── ACTIVE MODULES (PROJECTS) ───────────────────────────

      const { data: projects, error: projectsErr } = await supabase
        .from("projects")
        .select("type")
        .eq("tenant_id", tenantData.id)
        .eq("status", "active");

      if (projectsErr) {
        console.error("[TenantContext] projects error:", {
          message: projectsErr.message,
          details: (projectsErr as unknown as { details?: string })?.details,
          hint: (projectsErr as unknown as { hint?: string })?.hint,
        });
        setError(projectsErr.message);
        return;
      }

      const activeModules =
        projects && projects.length > 0
          ? projects.map((p) => p.type as ActiveModule)
          : ["crm" as ActiveModule]; // fallback seguro

      console.log("[DIAG] REMOVE AFTER VALIDATION — activeModules:", activeModules); // [DIAG] REMOVE AFTER VALIDATION

      setTenant({
        id: tenantData.id,
        name: tenantData.name,
        plan: tenantData.plan,
        activeModules,
        settings: tenantData.settings ?? {},
      });
    } catch (err) {
      console.error("[TenantContext] fetch error:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        isGlobalAdmin,
        loading,
        error,
        refresh: fetchTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTenantContext(): TenantContextType {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within <TenantProvider>");
  }
  return ctx;
}