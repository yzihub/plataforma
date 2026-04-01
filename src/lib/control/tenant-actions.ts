"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TenantPlan, TenantStatus } from "./types";

export type CreateTenantInput = {
  name: string;
  slug: string;
  plan: TenantPlan;
};

export type ActionResult = { success: true } | { success: false; error: string };

export async function createTenant(input: CreateTenantInput): Promise<ActionResult> {
  const { name, slug, plan } = input;

  if (!name.trim() || !slug.trim()) {
    return { success: false, error: "Nome e slug são obrigatórios." };
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { success: false, error: "Slug deve conter apenas letras minúsculas, números e hífens." };
  }

  const admin = createAdminClient();

  const { error } = await admin.from("tenants").insert({
    name: name.trim(),
    slug: slug.trim(),
    plan,
    status: "active" satisfies TenantStatus,
    settings: {},
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Já existe um tenant com esse slug." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/control/tenants");
  return { success: true };
}

export type UpdateTenantBrainInput = {
  tenantId: string;
  system_prompt: string;
  knowledge_rag_xml: string;
};

export async function updateTenantBrain(input: UpdateTenantBrainInput): Promise<ActionResult> {
  const { tenantId, system_prompt, knowledge_rag_xml } = input;
  if (!tenantId) return { success: false, error: "tenant_id ausente." };

  const admin = createAdminClient();

  const { error } = await admin
    .from("tenants")
    .update({ system_prompt, knowledge_rag_xml })
    .eq("id", tenantId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/control/tenants");
  return { success: true };
}

export async function enqueueFactoryActivate(tenantId: string): Promise<ActionResult> {
  if (!tenantId) return { success: false, error: "tenant_id ausente." };

  const admin = createAdminClient();

  // Fetch brain fields to include in the job payload
  const { data: tenant, error: fetchError } = await admin
    .from("tenants")
    .select("system_prompt, knowledge_rag_xml")
    .eq("id", tenantId)
    .single();

  if (fetchError) return { success: false, error: fetchError.message };

  const { error } = await admin.from("job_queue").insert({
    tenant_id: tenantId,
    action: "factory_activate",
    status: "pending",
    payload: {
      system_prompt: tenant?.system_prompt ?? null,
      knowledge_rag_xml: tenant?.knowledge_rag_xml ?? null,
    },
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/control/tenants");
  return { success: true };
}
