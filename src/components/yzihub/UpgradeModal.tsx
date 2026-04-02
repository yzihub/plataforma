"use client";

import React from "react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPlan: 'growth' | 'enterprise';
}

const TIER_CONFIG = {
  growth: {
    title: 'Desbloqueie o Plano Pro',
    benefits: [
      'Radar de Oportunidades',
      'Gestao de Trafego Pago',
      'Relatorios de Performance',
      'Suporte Prioritario',
    ],
    cta: 'Quero o Plano Pro',
    whatsappText: 'Quero%20conhecer%20o%20Plano%20Pro',
  },
  enterprise: {
    title: 'Desbloqueie o Plano Growth',
    benefits: [
      'Automacao de Conteudo IA',
      'Social Media Manager',
      'Todas as features Pro incluidas',
      'Suporte Dedicado',
    ],
    cta: 'Quero o Plano Growth',
    whatsappText: 'Quero%20conhecer%20o%20Plano%20Growth',
  },
} as const;

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, requiredPlan }) => {
  if (!isOpen) return null;

  const config = TIER_CONFIG[requiredPlan];

  const handleCTA = () => {
    window.open(
      `https://wa.me/5511999999999?text=${config.whatsappText}`,
      "_blank"
    );
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          {config.title}
        </h2>

        <ul className="mb-6 flex flex-col gap-3">
          {config.benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500/15">
                <svg
                  className="h-3 w-3 text-green-500"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {benefit}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleCTA}
            className="w-full rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            {config.cta}
          </button>
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            Agora nao
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
