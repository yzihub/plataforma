"use client"

import React, { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import Input from "@/components/form/input/InputField"
import Label from "@/components/form/Label"
import { ControlTenant, ProjectType } from "@/lib/control/types"

interface ActivateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  tenant?: ControlTenant | null
  onSuccess?: (result: { tenant_name: string; modules: ProjectType[] }) => void
}

interface FormData {
  tenant_name: string
  slug: string
  plan: string
  agent_name: string
  agent_phone: string
}

interface ModuleOption {
  id: string
  label: string
  description: string
  defaultChecked: boolean
  disabled: boolean
}

const MODULES: ModuleOption[] = [
  {
    id: "crm_setup",
    label: "CRM",
    description: "Pipeline de leads com Kanban operacional",
    defaultChecked: true,
    disabled: true,
  },
  {
    id: "sdr_setup",
    label: "SDR",
    description: "Atendimento automático via WhatsApp",
    defaultChecked: false,
    disabled: false,
  },
  {
    id: "radar_setup",
    label: "Radar",
    description: "Captação automática de leads (opcional)",
    defaultChecked: false,
    disabled: false,
  },
  {
    id: "social_setup",
    label: "Social",
    description: "Automação de conteúdo nas redes (opcional)",
    defaultChecked: false,
    disabled: false,
  },
  {
    id: "ia_onboarding",
    label: "IA Onboarding",
    description: "IA continua onboarding via WhatsApp",
    defaultChecked: false,
    disabled: false,
  },
]

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export default function ActivateProjectModal({
  isOpen,
  onClose,
  tenant,
  onSuccess,
}: ActivateProjectModalProps) {
  const [formData, setFormData] = useState<FormData>({
    tenant_name: "",
    slug: "",
    plan: "starter",
    agent_name: "",
    agent_phone: "",
  })
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(["crm_setup"])
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        tenant_name: "",
        slug: "",
        plan: "starter",
        agent_name: "",
        agent_phone: "",
      })
      setSlugManuallyEdited(false)
      setSelectedModules(new Set(["crm_setup"]))
      setError(null)
      setLoading(false)
    }
  }, [isOpen])

  function handleTenantNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setFormData((prev) => ({
      ...prev,
      tenant_name: value,
      slug: !slugManuallyEdited ? toSlug(value) : prev.slug,
    }))
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugManuallyEdited(true)
    setFormData((prev) => ({ ...prev, slug: e.target.value }))
  }

  function handleFieldChange(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  function handlePlanChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, plan: e.target.value }))
  }

  function toggleModule(moduleId: string) {
    if (moduleId === "crm_setup") return // Always active
    setSelectedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/factory/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenant?.id ?? null,
          tenant_name: formData.tenant_name,
          slug: formData.slug,
          plan: formData.plan,
          modules: Array.from(selectedModules),
          agent_name: formData.agent_name,
          agent_phone: formData.agent_phone,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? "Erro ao ativar projeto.")
        return
      }
      onSuccess?.({
        tenant_name: formData.tenant_name || tenant?.name || "",
        modules: Array.from(selectedModules) as ProjectType[],
      })
      onClose()
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  const isNewTenant = !tenant

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-xl">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {tenant ? `Ativar módulo em ${tenant.name}` : "Ativar Novo Projeto"}
        </h2>
        <p className="text-theme-sm text-gray-500 mt-0.5">
          Configuração do YZI FACTORY
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="px-6 pb-6 pt-4 space-y-6 max-h-[75vh] overflow-y-auto">

        {/* Section 1 — Client Identification (new tenant only) */}
        {isNewTenant && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="tenant_name">Nome do cliente</Label>
              <Input
                type="text"
                id="tenant_name"
                name="tenant_name"
                placeholder="Ex: Clínica Bella Pele"
                onChange={handleTenantNameChange}
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                type="text"
                id="slug"
                name="slug"
                placeholder="Ex: bellapele"
                defaultValue={formData.slug}
                onChange={handleSlugChange}
              />
            </div>

            <div>
              <Label htmlFor="plan">Plano</Label>
              <select
                id="plan"
                name="plan"
                value={formData.plan}
                onChange={handlePlanChange}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        )}

        {/* Section 2 — YZI FACTORY Modules */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Módulos a ativar
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MODULES.map((mod) => {
              const checked = selectedModules.has(mod.id)
              return (
                <label
                  key={mod.id}
                  className={[
                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition",
                    checked
                      ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20"
                      : "border-gray-200 dark:border-gray-700",
                    mod.disabled ? "cursor-default opacity-80" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => toggleModule(mod.id)}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={mod.disabled}
                    readOnly
                  />
                  {/* Custom checkbox */}
                  <div
                    className={[
                      "w-4 h-4 rounded border flex items-center justify-center mt-0.5 flex-shrink-0",
                      checked
                        ? "border-brand-500 bg-brand-500"
                        : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800",
                    ].join(" ")}
                  >
                    {checked && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 5L4 7L8 3"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {mod.label}
                    </p>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-500">
                      {mod.description}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Section 3 — AI Agent Configuration */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="agent_name">Nome do Agente</Label>
            <Input
              type="text"
              id="agent_name"
              name="agent_name"
              placeholder="Ex: Nina, Luana, Sofia"
              onChange={handleFieldChange("agent_name")}
            />
          </div>

          <div>
            <Label htmlFor="agent_phone">Número WhatsApp</Label>
            <Input
              type="text"
              id="agent_phone"
              name="agent_phone"
              placeholder="+55 11 99999-9999"
              onChange={handleFieldChange("agent_phone")}
            />
            <p className="text-theme-xs text-gray-400 mt-1">
              Número Evolution API conectado
            </p>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="px-4 py-3 text-sm text-red-700 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Section 4 — Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-theme-xs text-gray-400">
            O provisionamento leva ~2 minutos via YZI FACTORY
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-brand-500 text-white hover:bg-brand-600 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              ATIVAR PROJETO
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
