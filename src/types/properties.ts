// ─── Property Types ───────────────────────────────────────────────────────────
// Canonical source of truth for all property-related types.
// All components should import from here, not from PropertyCard.tsx.

export interface Property {
  id: string;
  tenant_id: string;
  title: string;
  photo_url: string | null;
  price: number;
  location: string;
  area_sqm: number | null;
  status: "available" | "sold" | "reserved";
  link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  property_type: string | null;
  construction_status: string | null;
  publication_status: string | null;
  operational_status: string | null;
  card_image: string | null;
  tags: string[] | null;
  neighborhood: string | null;
  purpose: string | null;
  // WordPress / external source fields (migration 010)
  external_id: string | null;
  source: string | null;
  description: string | null;
  images: unknown[] | null;
  features: Record<string, unknown> | null;
  score: number | null;
  priority: "low" | "normal" | "high" | "urgent" | null;
  kanban_stage: string | null;
}

// ─── Kanban Neighborhoods ─────────────────────────────────────────────────────

export const KANBAN_NEIGHBORHOODS = [
  "Cabo Branco",
  "Manaira",
  "Bessa",
  "Altiplano",
] as const;

export type PropertyKanbanStage =
  | (typeof KANBAN_NEIGHBORHOODS)[number]
  | "Outros";
