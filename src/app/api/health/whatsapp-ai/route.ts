import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";

import {
  testEvolutionConnection,
  verifyEvolutionWebhook,
} from "@/server/crm/evolution";
import { db } from "@/server/db";
import { aiProviderKeys, jobs } from "@/server/db/schema";

export const dynamic = "force-dynamic";

type Check = {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
};

async function runCheck(name: string, check: () => Promise<Check>) {
  try {
    return [name, await check()] as const;
  } catch (error) {
    return [
      name,
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
    ] as const;
  }
}

function readState(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const instance = record.instance as Record<string, unknown> | undefined;
  const connectionState = record.connectionState as
    | Record<string, unknown>
    | undefined;

  return (
    (typeof record.state === "string" ? record.state : undefined) ??
    (typeof record.status === "string" ? record.status : undefined) ??
    (typeof instance?.state === "string" ? instance.state : undefined) ??
    (typeof instance?.connectionStatus === "string"
      ? instance.connectionStatus
      : undefined) ??
    (typeof connectionState?.state === "string"
      ? connectionState.state
      : undefined)
  );
}

function isConnectedState(state?: string) {
  if (!state) return false;
  return ["open", "connected", "online"].includes(state.toLowerCase());
}

async function checkEvolutionConfigured(): Promise<Check> {
  const missing = [
    "EVOLUTION_BASE_URL",
    "EVOLUTION_API_KEY",
    "EVOLUTION_INSTANCE_NAME",
  ].filter((key) => !process.env[key]);

  return {
    ok: missing.length === 0,
    message:
      missing.length === 0
        ? "Evolution API environment is configured"
        : `Missing Evolution env: ${missing.join(", ")}`,
    details: { missing },
  };
}

async function checkEvolutionConnection(): Promise<Check> {
  const result = await testEvolutionConnection();
  const state = readState(result.connectionState);

  return {
    ok: isConnectedState(state),
    message: isConnectedState(state)
      ? "Evolution instance is connected"
      : "Evolution instance is not connected",
    details: {
      state: state ?? "unknown",
      hasInstance: Boolean(result.instance),
      webhookUrlConfigured: Boolean(result.webhookUrl),
    },
  };
}

async function checkEvolutionWebhook(): Promise<Check> {
  const result = await verifyEvolutionWebhook();

  return {
    ok: result.configured && result.enabled && result.urlMatches,
    message:
      result.configured && result.enabled && result.urlMatches
        ? "Evolution webhook is configured"
        : "Evolution webhook needs configuration",
    details: {
      configured: result.configured,
      enabled: result.enabled,
      urlMatches: result.urlMatches,
      missingEvents: result.missingEvents,
      expectedUrl: result.expectedUrl,
      configuredUrl: result.configuredUrl,
    },
  };
}

async function checkOpenAiConfigured(): Promise<Check> {
  if (process.env.OPENAI_API_KEY) {
    return { ok: true, message: "OpenAI API key is configured from env" };
  }

  const [storedKey] = await db
    .select({ id: aiProviderKeys.id })
    .from(aiProviderKeys)
    .where(
      and(
        eq(aiProviderKeys.provider, "openai"),
        eq(aiProviderKeys.isActive, true),
      ),
    )
    .orderBy(desc(aiProviderKeys.isDefault), desc(aiProviderKeys.updatedAt))
    .limit(1);

  const ok = Boolean(storedKey && process.env.SECRETS_ENCRYPTION_KEY);
  return {
    ok,
    message: ok
      ? "OpenAI API key is configured from database"
      : storedKey
        ? "Stored OpenAI key exists, but SECRETS_ENCRYPTION_KEY is missing"
        : "OpenAI API key is not configured",
    details: {
      hasStoredKey: Boolean(storedKey),
      hasEncryptionKey: Boolean(process.env.SECRETS_ENCRYPTION_KEY),
    },
  };
}

async function checkJobProcessor(): Promise<Check> {
  await db.execute(sql`select 1 as ok`);
  const [queuedJob] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.status, "queued"))
    .limit(1);

  return {
    ok: true,
    message: "Job processor database tables are reachable",
    details: {
      cronConfiguredInCode: true,
      hasProcessSecret: Boolean(process.env.JOBS_PROCESS_SECRET),
      hasQueuedJobs: Boolean(queuedJob),
    },
  };
}

export async function GET() {
  const checks = Object.fromEntries(
    await Promise.all([
      runCheck("evolutionConfigured", checkEvolutionConfigured),
      runCheck("evolutionConnection", checkEvolutionConnection),
      runCheck("evolutionWebhook", checkEvolutionWebhook),
      runCheck("openAiConfigured", checkOpenAiConfigured),
      runCheck("jobProcessor", checkJobProcessor),
    ]),
  ) as Record<string, Check>;

  const ready = Object.values(checks).every((check) => check.ok);

  return NextResponse.json(
    {
      ready,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 },
  );
}
