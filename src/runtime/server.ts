import { loadRuntimeConfig } from "./config";
import { buildRuntimeServer } from "./http_api";
import { logger } from "./observability";

async function main() {
  const config = loadRuntimeConfig();
  const app = buildRuntimeServer(config);
  await app.listen({ port: config.port, host: "0.0.0.0" });
  logger.info({ port: config.port, mode: config.runtimeMode }, "Jurema cognitive runtime listening");
}

if (require.main === module) {
  main().catch((error) => {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "runtime failed to start");
    process.exit(1);
  });
}

