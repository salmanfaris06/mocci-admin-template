import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { getConfig } from "./config";
import { runWorkerLoop } from "./jobs/worker";
import { registerHealthRoute } from "./routes/health";
import { registerEvolutionWebhookRoute } from "./routes/webhooks-evolution";

export function buildServer() {
  const config = getConfig();
  const app = Fastify({ logger: true });
  app.register(cors, { origin: config.DASHBOARD_ORIGIN });
  app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  app.register(registerHealthRoute);
  app.register(registerEvolutionWebhookRoute);
  return app;
}

async function main() {
  const config = getConfig();
  const app = buildServer();
  await app.listen({ port: config.BACKEND_PORT, host: "0.0.0.0" });
  await runWorkerLoop();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
