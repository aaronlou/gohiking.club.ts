import { NextResponse } from "next/server";
import { canViewPhotoRecord, isPublicPhoto } from "@/server/activities/access";
import { getSessionFromRequest } from "@/server/auth-session";
import { verifyPhotoGrant } from "@/server/media/signed-url";
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

  const isPublic = isPublicPhoto(photo);
  let viewerId: string | null = null;

  if (!isPublic) {
    // Two supported paths: a short-lived, photo-bound grant for mini-program
    // image tags, or the normal same-origin session cookie for the web.
    const grant = verifyPhotoGrant(photo.id, request);
    if (grant) {
      viewerId = grant.viewerId;
    } else {
      const session = await getSessionFromRequest(request);
      viewerId = session?.user.id ?? null;
    }

    if (!(await canViewPhotoRecord(photo, viewerId))) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  const requested = new URL(request.url).searchParams.get("variant");
  const variant =
    requested === "thumb" ? "thumb" : requested === "preview" ? "preview" : "full";
  const key =
    variant === "thumb"
      ? photo.thumbKey
      : variant === "preview"
        ? (photo.previewKey ?? photo.thumbKey ?? photo.fileKey)
        : (photo.fileKey ?? photo.previewKey ?? photo.thumbKey);

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
