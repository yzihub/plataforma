import fs from "fs";
import path from "path";

export function loadTenantContext(slug: string) {
  const basePath = path.join(process.cwd(), "clientes", slug);

  function readSafe(file: string) {
    try {
      return fs.readFileSync(path.join(basePath, file), "utf-8");
    } catch {
      return null;
    }
  }

  return {
    knowledge: readSafe("knowledge.xml"),
    prompts: readSafe("prompts.md"),
    automations: readSafe("automations.md"),
    schema: readSafe("schema.md"),
    uiMap: readSafe("ui-map.md"),
  };
}