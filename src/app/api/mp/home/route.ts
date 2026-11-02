import { NextResponse } from "next/server";
import { describeProvider } from "@/server/ai/evaluator";
import { requireApiUser } from "@/server/auth-session";
import {
  getFeaturedPhotos,
  getPublicStats,
  getThisWeekPhotos,
} from "@/server/photos/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await requireApiUser(request);
  const viewerId = viewer?.id ?? null;

  const [featured, thisWeek, stats, provider] = await Promise.all([
    getFeaturedPhotos(8, viewerId),
    getThisWeekPhotos(8, viewerId),
    getPublicStats(),
    Promise.resolve(describeProvider()),
  ]);

  return NextResponse.json({ featured, thisWeek, stats, provider });
}
