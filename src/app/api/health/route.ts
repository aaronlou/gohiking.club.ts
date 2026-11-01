import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ensureStorage } from "@/server/media/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const checks: Record<string, "ok" | "error"> = {};

  try {
    await db.execute(sql`select 1`);
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    await ensureStorage();
    checks.storage = "ok";
  } catch {
    checks.storage = "error";
  }

  const healthy = Object.values(checks).every((check) => check === "ok");
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "gohiking.club",
      checks,
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
