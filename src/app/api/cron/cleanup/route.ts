import { NextResponse } from "next/server";
import { cleanupExpiredMedia } from "@/server/photos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await cleanupExpiredMedia();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return POST(request);
}
