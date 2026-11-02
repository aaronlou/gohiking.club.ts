import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signPhotoMedia, verifyPhotoGrant } from "./signed-url";

const viewer = "viewer-123";
const base = {
  id: "a1000000-0000-4000-8000-000000000005",
  status: "accepted",
  visibility: "activity",
  imageUrl: "/api/photos/a/image?variant=preview&v=1",
  previewUrl: "/api/photos/a/image?variant=preview&v=1",
  fullUrl: "/api/photos/a/image?variant=full&v=1",
  thumbUrl: "/api/photos/a/image?variant=thumb&v=1",
};

describe("signed photo media", () => {
  beforeEach(() => {
    process.env.MEDIA_URL_SECRET = "test-media-secret";
  });

  afterEach(() => {
    delete process.env.MEDIA_URL_SECRET;
  });

  it("signs private photo URLs with a viewer-bound grant and no session token", () => {
    const signed = signPhotoMedia(base, viewer);
    for (const url of [signed.imageUrl, signed.previewUrl, signed.fullUrl, signed.thumbUrl]) {
      expect(url).toContain("uid=viewer-123");
      expect(url).toContain("exp=");
      expect(url).toContain("sig=");
      expect(url).not.toContain("token=");
    }
    expect(verifyPhotoGrant(base.id, new Request(new URL(signed.previewUrl, "https://example.com"))))
      .toEqual({ viewerId: viewer });
  });

  it("leaves public photos unsigned", () => {
    const signed = signPhotoMedia({ ...base, visibility: "public" }, viewer);
    expect(signed.previewUrl).toBe(base.previewUrl);
    expect(signed.previewUrl).not.toContain("sig=");
  });

  it("rejects a tampered viewer id", () => {
    const signed = signPhotoMedia(base, viewer);
    const url = new URL(signed.previewUrl, "https://example.com");
    url.searchParams.set("uid", "someone-else");
    expect(verifyPhotoGrant(base.id, new Request(url))).toBeNull();
  });

  it("rejects a missing grant", () => {
    expect(verifyPhotoGrant(base.id, new Request("https://example.com/image"))).toBeNull();
  });
});
