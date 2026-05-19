import type { CognitiveSeverity } from "@/lib/cockpit/types";

const CONFIG: Record<CognitiveSeverity, { label: string; className: string }> = {
  critical: {
    label: "Crítico",
    className:
      "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  },
  warning: {
    label: "Irregular",
    className:
      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  },
  nominal: {
    label: "Normal",
    className:
      "text-gray-400 dark:text-gray-500",
  },
  info: {
    label: "Contextual",
    className:
      "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  },
};

export default function CognitiveSeverityBadge({
  severity,
}: {
  severity: CognitiveSeverity;
}) {
  const { label, className } = CONFIG[severity];

  if (severity === "nominal") {
    return (
      <span className={`text-xs font-normal ${className}`}>{label}</span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
