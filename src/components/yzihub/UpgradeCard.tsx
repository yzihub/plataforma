"use client";

import React from "react";

interface UpgradeCardProps {
  onUpgradeClick: () => void;
}

const UpgradeCard: React.FC<UpgradeCardProps> = ({ onUpgradeClick }) => {
  return (
    <div className="rounded-2xl border border-brand-500/20 bg-gradient-to-b from-brand-500/10 to-brand-500/5 dark:bg-white/[0.03] p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-white">Evolua seu Growth</p>
        <p className="text-xs text-gray-400">
          Desbloqueie o Radar e Tráfego Pago no Plano Pro
        </p>
      </div>
      <button
        onClick={onUpgradeClick}
        className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
      >
        Upgrade Plan
      </button>
    </div>
  );
};

export default UpgradeCard;
