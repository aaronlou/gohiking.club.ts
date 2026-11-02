import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived, photo-bound media grants for clients that cannot set a Cookie
 * on <image> requests (the WeChat mini-program). A grant authorises exactly
 * one photo for one viewer, and never exposes the Better Auth session token.
 */
const TTL_SECONDS = 30 * 60;

type SignablePhoto = {
  id: string;
  status: string;
  visibility: string;
  imageUrl: string;
  previewUrl: string;
  fullUrl: string;
  thumbUrl: string;
};

function mediaSecret() {
  const value = process.env.MEDIA_URL_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!value) {
    throw new Error("MEDIA_URL_SECRET or BETTER_AUTH_SECRET must be configured");
  }
  return value;
}

function signature(photoId: string, viewerId: string, expires: number) {
  return createHmac("sha256", mediaSecret())
    .update(`${photoId}:${viewerId}:${expires}`)
    .digest("base64url");
}

function withGrant(url: string, photoId: string, viewerId: string, expires: number) {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}uid=${encodeURIComponent(viewerId)}&exp=${expires}&sig=${signature(
    photoId,
    viewerId,
    expires,
  )}`;
}

export function signPhotoMedia<T extends SignablePhoto>(
  photo: T,
  viewerId: string | null,
): T {
  if (!viewerId) return photo;
  if (photo.status === "accepted" && photo.visibility === "public") return photo;

  const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  return {
    ...photo,
    imageUrl: withGrant(photo.imageUrl, photo.id, viewerId, expires),
    previewUrl: withGrant(photo.previewUrl, photo.id, viewerId, expires),
    fullUrl: withGrant(photo.fullUrl, photo.id, viewerId, expires),
    thumbUrl: withGrant(photo.thumbUrl, photo.id, viewerId, expires),
  };
}

export function verifyPhotoGrant(photoId: string, request: Request): { viewerId: string } | null {
  const params = new URL(request.url).searchParams;
  const viewerId = params.get("uid");
  const expiresRaw = params.get("exp");
  const provided = params.get("sig");

  if (!viewerId || !expiresRaw || !provided) return null;

  const expires = Number(expiresRaw);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const expected = signature(photoId, viewerId, expires);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { viewerId };
}
