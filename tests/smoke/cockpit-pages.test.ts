import { describe, it, expect } from "vitest";

const ROUTES: ReadonlyArray<{ name: string; importer: () => Promise<{ default?: unknown }> }> = [
  { name: "/cockpit",                importer: () => import("@/app/cockpit/page") },
  { name: "/cockpit/corretores",     importer: () => import("@/app/cockpit/corretores/page") },
  { name: "/cockpit/evolution",      importer: () => import("@/app/cockpit/evolution/page") },
  { name: "/cockpit/calendario",     importer: () => import("@/app/cockpit/calendario/page") },
  { name: "/cockpit/imoveis",        importer: () => import("@/app/cockpit/imoveis/page") },
  { name: "/cockpit/leads",          importer: () => import("@/app/cockpit/leads/page") },
  { name: "/cockpit/contratos",      importer: () => import("@/app/cockpit/contratos/page") },
  { name: "/cockpit/financeiro",     importer: () => import("@/app/cockpit/financeiro/page") },
];

describe("Cockpit pages (smoke import)", () => {
  for (const route of ROUTES) {
    it(`carrega o módulo da rota ${route.name}`, async () => {
      const mod = await route.importer();
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe("function");
    });
  }
});
