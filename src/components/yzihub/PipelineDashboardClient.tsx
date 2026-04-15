"use client";

import { useState } from "react";
import type { Lead, PipelineStage } from "@/lib/crm/types";
import PipelineHeader from "@/components/yzihub/pipeline/PipelineHeader";
import PipelineAlerts from "@/components/yzihub/pipeline/PipelineAlerts";
import PipelineKPIs from "@/components/yzihub/pipeline/PipelineKPIs";
import PipelineCharts from "@/components/yzihub/pipeline/PipelineCharts";
import PipelineLeadsList from "@/components/yzihub/pipeline/PipelineLeadsList";
import AssignBrokerModal from "@/components/yzihub/pipeline/AssignBrokerModal";

interface Broker {
  id: string;
  name: string;
}

interface FilterState {
  brokerId?: string;
  period?: string;
  source?: string;
}

interface ModalState {
  open: boolean;
  leadId: string | null;
  mode: "assign" | "reassign";
}

interface PipelineDashboardClientProps {
  leads: Lead[];
  stages: PipelineStage[];
  brokers: Broker[];
  tenantName: string;
}

export default function PipelineDashboardClient({
  leads,
  stages,
  brokers,
  tenantName: _tenantName,
}: PipelineDashboardClientProps) {
  const [filters, setFilters] = useState<FilterState>({});
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    leadId: null,
    mode: "assign",
  });

  // Filter leads in memory
  const filteredLeads = leads.filter((lead) => {
    if (filters.brokerId && lead.assigned_to !== filters.brokerId) return false;
    if (filters.source && lead.source !== filters.source) return false;
    if (filters.period) {
      const days = parseInt(filters.period, 10);
      if (!isNaN(days)) {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        if (new Date(lead.created_at).getTime() < cutoff) return false;
      }
    }
    return true;
  });

  function handleFilterChange(f: FilterState) {
    setFilters((prev) => ({ ...prev, ...f }));
  }

  function openAssignModal(leadId: string) {
    setModalState({ open: true, leadId, mode: "assign" });
  }

  function openReassignModal(leadId: string) {
    setModalState({ open: true, leadId, mode: "reassign" });
  }

  function closeModal() {
    setModalState({ open: false, leadId: null, mode: "assign" });
  }

  function handleConfirmAssign(leadId: string, brokerId: string) {
    console.log("assign", leadId, brokerId);
    closeModal();
  }

  const selectedLead = filteredLeads.find((l) => l.id === modalState.leadId) ?? null;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Bloco 1: Header */}
      <PipelineHeader brokers={brokers} onFilterChange={handleFilterChange} />

      {/* Bloco 2: Alertas operacionais */}
      <PipelineAlerts leads={filteredLeads} />

      {/* Bloco 3: KPIs por stage */}
      <PipelineKPIs leads={filteredLeads} stages={stages} />

      {/* Bloco 4: Gráficos */}
      <PipelineCharts leads={filteredLeads} stages={stages} brokers={brokers} />

      {/* Bloco 5: Lista operacional */}
      <PipelineLeadsList
        leads={filteredLeads}
        brokers={brokers}
        onAssignBroker={openAssignModal}
        onReassignBroker={openReassignModal}
      />

      {/* Modal de atribuição */}
      <AssignBrokerModal
        open={modalState.open}
        lead={selectedLead}
        brokers={brokers}
        mode={modalState.mode}
        onClose={closeModal}
        onConfirm={handleConfirmAssign}
      />
    </div>
  );
}
