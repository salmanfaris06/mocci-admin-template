import { z } from "zod";

const envSchema = z.object({
  BACKEND_PORT: z.coerce.number().default(4000),
  DASHBOARD_ORIGIN: z.string().url().default("http://localhost:3000"),
  ADMIN_API_TOKEN: z.string().min(16).optional(),
  WEBHOOK_SHARED_SECRET: z.string().min(16).optional(),
});

export type BackendConfig = z.infer<typeof envSchema>;
export function getConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  return envSchema.parse(env);
}
