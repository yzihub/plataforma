// Ponto de entrada público para o hook de tenant.
// O cache e a lógica de fetch vivem em TenantContext — este arquivo
// apenas re-exporta para manter o import limpo:
//   import { useTenant } from "@/hooks/useTenant"

export { useTenantContext as useTenant } from "@/context/TenantContext";
export type { TenantData, TenantPlan, ActiveModule } from "@/context/TenantContext";
