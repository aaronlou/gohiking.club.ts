import { describe, expect, it } from "vitest";
import type { PhotoDto } from "@/server/photos/dto";
import { groupPhotosByAuthor, groupPhotosByMonth, groupPhotosByTheme, themeCounts } from "./archive";

function photo(overrides: Partial<PhotoDto>): PhotoDto {
  return {
    id: overrides.id ?? "p1",
    title: overrides.title ?? "山",
    caption: null,
    status: "accepted",
    visibility: "public",
    theme: overrides.theme ?? "ridge",
    aiTheme: overrides.theme ?? "ridge",
    aiProvider: "editorial",
    aiModel: "test",
    score: 4.2,
    summary: "测试",
    strengths: [],
    improvements: [],
    tags: [],
    takenAt: "2026-09-10T12:00:00.000Z",
    locationName: "山脊",
    cameraModel: null,
    lensModel: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    focalLength: null,
    width: 1600,
    height: 1067,
    blurData: null,
    dominantColor: null,
    featured: false,
    likeCount: 0,
    source: "upload",
    creditName: null,
    creditUrl: null,
    createdAt: "2026-09-10T12:00:00.000Z",
    evaluatedAt: null,
    acceptedAt: "2026-09-10T12:00:00.000Z",
    expiresAt: null,
    imageUrl: "/image",
    previewUrl: "/preview",
    fullUrl: "/full",
    thumbUrl: "/thumb",
    author:
      overrides.author ??
      ({ id: "u1", name: "林深", username: "linshen", homeBase: "成都", bio: null } as PhotoDto["author"]),
    ...overrides,
  };
}

describe("archive grouping", () => {
  it("orders months newest first and groups by taken date", () => {
    const groups = groupPhotosByMonth([
      photo({ id: "a", takenAt: "2026-08-01T12:00:00.000Z" }),
      photo({ id: "b", takenAt: "2026-10-01T12:00:00.000Z" }),
      photo({ id: "c", takenAt: "2026-08-09T12:00:00.000Z" }),
    ]);
    expect(groups.map((group) => group.key)).toEqual(["2026-10", "2026-08"]);
    expect(groups[1]?.photos.map((item) => item.id)).toEqual(["c", "a"]);
  });

  it("uses the canonical theme order and omits empty themes", () => {
    const groups = groupPhotosByTheme([
      photo({ id: "forest", theme: "forest" }),
      photo({ id: "ridge", theme: "ridge" }),
      photo({ id: "ridge2", theme: "ridge" }),
    ]);
    expect(groups.map((group) => group.id)).toEqual(["ridge", "forest"]);
    expect(groups[0]?.photos).toHaveLength(2);
  });

  it("sorts authors by number of accepted photos and averages", () => {
    const groups = groupPhotosByAuthor([
      photo({ id: "a", score: 4 }),
      photo({ id: "b", score: 4.5, author: { id: "u1", name: "林深", username: "linshen", homeBase: null, bio: null } }),
      photo({ id: "c", score: 4.8, author: { id: "u2", name: "阿岚", username: "alan", homeBase: null, bio: null } }),
      photo({ id: "d", score: 4.2, author: { id: "u2", name: "阿岚", username: "alan", homeBase: null, bio: null } }),
      photo({ id: "e", score: 4.1 }),
    ]);
    expect(groups[0]?.username).toBe("linshen");
    expect(groups[0]?.averageScore).toBe(4.2);
    expect(groups[1]?.photos).toHaveLength(2);
  });

  it("counts themes for the filter rail", () => {
    const counts = themeCounts([photo({ theme: "night" }), photo({ theme: "night" }), photo({ theme: "water" })]);
    expect(counts.find((item) => item.id === "night")?.count).toBe(2);
  });
});
