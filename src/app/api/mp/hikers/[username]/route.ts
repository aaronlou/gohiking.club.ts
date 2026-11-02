import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/auth-session";
import { getPhotosByUsername } from "@/server/photos/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const viewer = await requireApiUser(request);
  const data = await getPhotosByUsername(username, viewer?.id ?? null);

  if (!data) {
    return NextResponse.json({ error: "没有找到这位徒步者", code: "not_found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
