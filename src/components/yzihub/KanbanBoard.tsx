"use client";

// Etapas do funil de leads (Jurema Brokers — qualificacao inicial)
const STAGES = [
  'Novo Lead',
  'Lead Quente',
  'Em Qualificacao',
  'Qualificando',
  'Agendamento',
];

type Lead = {
  id: string;
  nome: string;
  telefone?: string;
  interesse?: string;
  faixa_valor?: string;
  valor_imovel?: number; // mantido para retrocompatibilidade
  status: string;
  origem?: string;
};

interface KanbanBoardProps {
  leads: Lead[];
  onMoveLead?: (leadId: string, newStatus: string) => void;
  onSelectLead?: (lead: Lead) => void;
}

export const KanbanBoard = ({ leads, onSelectLead }: KanbanBoardProps) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.status === stage);

        return (
          <div
            key={stage}
            className="flex flex-col w-72 shrink-0 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50"
          >
            {/* Header da coluna */}
            <div className="px-3.5 pt-3.5 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
                  {stage}
                </span>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full shrink-0">
                  {stageLeads.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5 p-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-260px)] min-h-[80px]">
              {stageLeads.length === 0 && (
                <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-300 dark:text-gray-600">Sem leads nesta etapa</p>
                </div>
              )}

              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead?.(lead)}
                  className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-800 cursor-pointer hover:border-brand-300 hover:shadow-md transition-all space-y-2"
                >
                  {/* Nome */}
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                    {lead.nome}
                  </p>

                  {/* Telefone (somente se presente) */}
                  {lead.telefone && (
                    <p className="text-xs text-gray-400 truncate">{lead.telefone}</p>
                  )}

                  {/* Interesse como tag pill */}
                  {lead.interesse && (
                    <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {lead.interesse}
                    </span>
                  )}

                  {/* Faixa de valor */}
                  {lead.faixa_valor && (
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {lead.faixa_valor}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
