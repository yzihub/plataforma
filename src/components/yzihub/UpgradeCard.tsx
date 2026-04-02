"use client";

import React from "react";

interface UpgradeCardProps {
  onUpgradeClick: () => void;
  tenantPlan: 'starter' | 'growth';
}

const UpgradeCard: React.FC<UpgradeCardProps> = ({ onUpgradeClick, tenantPlan }) => {
  const config = tenantPlan === 'starter'
    ? {
        title: 'Evolua seu Growth',
        description: 'Desbloqueie o Radar e Trafego Pago no Plano Pro',
        cta: 'Ver Plano Pro',
      }
    : {
        title: 'Escale com Automacao',
        description: 'Desbloqueie Conteudo IA e Social Media no Plano Growth',
        cta: 'Ver Plano Growth',
      };

  return (
    <div className="rounded-2xl border border-brand-500/20 bg-gradient-to-b from-brand-500/10 to-brand-500/5 dark:bg-white/[0.03] p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-white">{config.title}</p>
        <p className="text-xs text-gray-400">
          {config.description}
        </p>
      </div>
      <button
        onClick={onUpgradeClick}
        className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
      >
        {config.cta}
      </button>
    </div>
  );
};

export default UpgradeCard;
