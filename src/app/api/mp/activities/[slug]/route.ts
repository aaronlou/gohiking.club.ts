import { NextResponse } from "next/server";
import { getActivityBySlug } from "@/server/activities/queries";
import { requireApiUser } from "@/server/auth-session";
import { signPhotoMedia } from "@/server/media/signed-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await requireApiUser(request);
  const data = await getActivityBySlug(slug, viewer?.id ?? null);

  if (!data) {
    return NextResponse.json({ error: "没有找到这次活动", code: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ...data,
    photos: data.photos.map((photo) => signPhotoMedia(photo, viewer?.id ?? null)),
  });
}
