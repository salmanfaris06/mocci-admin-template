import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/server/db";

export const dynamic = "force-dynamic";

function redactDatabaseUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
  } catch {
    return "configured";
  }
}

export async function GET() {
  const startedAt = Date.now();
  const configured = Boolean(process.env.DATABASE_URL);

  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        database: null,
        latencyMs: 0,
        error: "DATABASE_URL is not configured",
      },
      { status: 503 },
    );
  }

  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      ok: true,
      configured: true,
      database: redactDatabaseUrl(process.env.DATABASE_URL),
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        database: redactDatabaseUrl(process.env.DATABASE_URL),
        latencyMs: Date.now() - startedAt,
        error:
          error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 503 },
    );
  }
}
