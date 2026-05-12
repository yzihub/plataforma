"use client";

import { useEffect, useState } from "react";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { useTenantContext } from "@/context/TenantContext";

// ─── Perfil operacional Jurema ────────────────────────────────────────────────
// Exibe dados reais do usuário/tenant. Edição mínima: nome + telefone.
// Sem social, sem endereço, sem demo TailAdmin.

interface ProfileData {
  full_name:     string;
  email:         string;
  role:          string | null;
  phone:         string;
  last_sign_in:  string | null;
  initials:      string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day:    "2-digit",
      month:  "2-digit",
      year:   "numeric",
      hour:   "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatRole(role: string | null): string {
  if (!role) return "—";
  const map: Record<string, string> = {
    global_admin: "Admin Global",
    admin:        "Administrador",
    corretor:     "Corretor",
    sdr:          "SDR",
    gestor:       "Gestor",
  };
  return map[role] ?? role;
}

export default function ProfileCard() {
  const { tenant } = useTenantContext();
  const { isOpen, openModal, closeModal } = useModal();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form edit
  const [editName, setEditName]   = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    if (isDevBypass) {
      setProfile({
        full_name:    "Dev User",
        email:        "dev@yzihub.local",
        role:         "admin",
        phone:        "",
        last_sign_in: new Date().toISOString(),
        initials:     "DU",
      });
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

        const full_name = prof?.full_name
          ?? (user.user_metadata?.full_name as string | undefined)
          ?? user.email?.split("@")[0]
          ?? "Usuário";

        const phone =
          (user.user_metadata?.phone as string | undefined)
          ?? user.phone
          ?? "";

        setProfile({
          full_name,
          email:        user.email ?? "",
          role:         prof?.role ?? (user.user_metadata?.role as string) ?? null,
          phone,
          last_sign_in: user.last_sign_in_at ?? null,
          initials:     getInitials(full_name),
        });
      } catch {
        // mantém loading false
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function handleOpen() {
    if (!profile) return;
    setEditName(profile.full_name);
    setEditPhone(profile.phone);
    setSaveError(null);
    openModal();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    if (!editName.trim()) {
      setSaveError("Nome é obrigatório.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const isDevBypass =
      process.env.NEXT_PUBLIC_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production";

    try {
      if (!isDevBypass) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setSaveError("Sessão expirada.");
          setSaving(false);
          return;
        }

        // Atualiza profiles.full_name
        const { error: profErr } = await supabase
          .from("profiles")
          .update({ full_name: editName.trim(), updated_at: new Date().toISOString() })
          .eq("id", user.id);

        if (profErr) {
          setSaveError("Erro ao salvar nome.");
          setSaving(false);
          return;
        }

        // Atualiza phone no user_metadata
        const { error: authErr } = await supabase.auth.updateUser({
          data: { phone: editPhone.trim() || null, full_name: editName.trim() },
        });

        if (authErr) {
          setSaveError("Nome salvo, mas falhou ao atualizar telefone.");
        }
      }

      setProfile({
        ...profile,
        full_name: editName.trim(),
        phone:     editPhone.trim(),
        initials:  getInitials(editName.trim()),
      });
      closeModal();
    } catch {
      setSaveError("Erro inesperado ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="animate-pulse flex items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Não foi possível carregar o perfil. Faça login novamente.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Header card — identidade */}
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center gap-5 xl:flex-row">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-300 text-2xl font-semibold select-none">
              {profile.initials}
            </span>
            <div className="text-center xl:text-left">
              <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
                {profile.full_name}
              </h4>
              <div className="flex flex-col items-center gap-1 text-sm text-gray-500 dark:text-gray-400 xl:flex-row xl:gap-3">
                <span>{formatRole(profile.role)}</span>
                {tenant?.name && (
                  <>
                    <span className="hidden xl:inline-block h-3.5 w-px bg-gray-300 dark:bg-gray-700" />
                    <span>{tenant.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleOpen}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill="" />
            </svg>
            Editar
          </button>
        </div>
      </div>

      {/* Card — dados operacionais */}
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <h5 className="mb-5 text-base font-semibold text-gray-800 dark:text-white/90">
          Informações
        </h5>

        <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2">
          <Field label="Nome">{profile.full_name}</Field>
          <Field label="E-mail">{profile.email}</Field>
          <Field label="Telefone">{profile.phone || "—"}</Field>
          <Field label="Perfil">{formatRole(profile.role)}</Field>
          <Field label="Tenant">{tenant?.name ?? "—"}</Field>
          <Field label="Último acesso">{formatDateTime(profile.last_sign_in)}</Field>
        </div>
      </div>

      {/* Modal de edição mínima */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[480px] m-4">
        <div className="relative w-full overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-5">
            <h4 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Editar perfil
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Atualize seu nome e telefone.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-400">Nome *</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-400">Telefone</label>
              <input
                type="text"
                placeholder="Ex: 5585988880000"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            {saveError && (
              <p className="text-xs text-red-500">{saveError}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-all"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 dark:text-white/90 break-words">{children}</p>
    </div>
  );
}
