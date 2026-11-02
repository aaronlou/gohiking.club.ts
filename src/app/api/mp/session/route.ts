import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireApiUser(request);
  return NextResponse.json({
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          bio: user.bio ?? null,
          homeBase: user.homeBase ?? null,
          createdAt: user.createdAt,
        }
      : null,
  });
}
