import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/server/auth-session";
import { readMedia } from "@/server/media/storage";
import { getPhotoRecord } from "@/server/photos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const photo = await getPhotoRecord(id);
  if (!photo) {
    return new NextResponse("Not found", { status: 404 });
  }

  const isPublic = photo.status === "accepted" && photo.visibility === "public";
  let isOwner = false;

  if (!isPublic) {
    const session = await getSessionFromRequest(request);
    isOwner = session?.user.id === photo.userId;
  }

  if (!isPublic && !isOwner) {
    return new NextResponse("Not found", { status: 404 });
  }

  const variant = new URL(request.url).searchParams.get("variant") === "thumb" ? "thumb" : "display";
  const key = variant === "thumb" ? photo.thumbKey : photo.fileKey;

  if (!key) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const data = await readMedia(key);
    const cacheControl = isPublic
      ? "public, max-age=31536000, immutable"
      : "private, no-store, max-age=0";

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "content-type": "image/webp",
        "content-length": String(data.byteLength),
        "cache-control": cacheControl,
        "x-content-type-options": "nosniff",
        etag: `"${photo.id}-${variant}-${photo.evaluatedAt?.getTime() ?? photo.createdAt.getTime()}"`,
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
