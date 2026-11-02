import type { Photo, User } from "@/server/db/schema";

export type PublicAuthor = {
  id: string;
  name: string;
  username: string;
  homeBase: string | null;
  bio: string | null;
};

export type PhotoDto = {
  id: string;
  title: string;
  caption: string | null;
  status: Photo["status"];
  visibility: Photo["visibility"];
  theme: string;
  aiTheme: string | null;
  aiProvider: string | null;
  aiModel: string | null;
  score: number | null;
  summary: string | null;
  strengths: string[];
  improvements: string[];
  tags: string[];
  takenAt: string | null;
  locationName: string | null;
  cameraModel: string | null;
  lensModel: string | null;
  aperture: string | null;
  shutterSpeed: string | null;
  iso: number | null;
  focalLength: string | null;
  width: number;
  height: number;
  blurData: string | null;
  dominantColor: string | null;
  featured: boolean;
  likeCount: number;
  source: string;
  creditName: string | null;
  creditUrl: string | null;
  createdAt: string;
  evaluatedAt: string | null;
  acceptedAt: string | null;
  expiresAt: string | null;
  imageUrl: string;
  previewUrl: string;
  fullUrl: string;
  thumbUrl: string;
  author: PublicAuthor;
  liked?: boolean;
};

function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function toAuthor(user: {
  id: string;
  name: string;
  username: string;
  homeBase?: string | null;
  bio?: string | null;
}): PublicAuthor {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    homeBase: user.homeBase ?? null,
    bio: user.bio ?? null,
  };
}

export function toPhotoDto(
  photo: Photo,
  author: Pick<User, "id" | "name" | "username" | "homeBase" | "bio">,
  options: { liked?: boolean } = {},
): PhotoDto {
  const version = photo.evaluatedAt
    ? new Date(photo.evaluatedAt).getTime().toString(36)
    : new Date(photo.createdAt).getTime().toString(36);

  return {
    id: photo.id,
    title: photo.title,
    caption: photo.caption,
    status: photo.status,
    visibility: photo.visibility,
    theme: photo.theme,
    aiTheme: photo.aiTheme,
    aiProvider: photo.aiProvider,
    aiModel: photo.aiModel,
    score: photo.score ? Number.parseFloat(photo.score) : null,
    summary: photo.aiSummary,
    strengths: photo.aiStrengths ?? [],
    improvements: photo.aiImprovements ?? [],
    tags: photo.aiTags ?? [],
    takenAt: iso(photo.takenAt),
    locationName: photo.locationName,
    cameraModel: photo.cameraModel,
    lensModel: photo.lensModel,
    aperture: photo.aperture,
    shutterSpeed: photo.shutterSpeed,
    iso: photo.iso,
    focalLength: photo.focalLength,
    width: photo.width,
    height: photo.height,
    blurData: photo.blurData,
    dominantColor: photo.dominantColor,
    featured: photo.featured,
    likeCount: photo.likeCount,
    source: photo.source,
    creditName: photo.creditName,
    creditUrl: photo.creditUrl,
    createdAt: iso(photo.createdAt) as string,
    evaluatedAt: iso(photo.evaluatedAt),
    acceptedAt: iso(photo.acceptedAt),
    expiresAt: iso(photo.expiresAt),
    imageUrl: `/api/photos/${photo.id}/image?variant=full&v=${version}`,
    previewUrl: photo.previewKey
      ? `/api/photos/${photo.id}/image?variant=preview&v=${version}`
      : `/api/photos/${photo.id}/image?variant=thumb&v=${version}`,
    fullUrl: `/api/photos/${photo.id}/image?variant=full&v=${version}`,
    thumbUrl: `/api/photos/${photo.id}/image?variant=thumb&v=${version}`,
    author: toAuthor(author),
    ...(options.liked === undefined ? {} : { liked: options.liked }),
  };
}

export function toStudioPhotoDto(
  photo: Photo,
  author: Pick<User, "id" | "name" | "username" | "homeBase" | "bio">,
) {
  return toPhotoDto(photo, author);
}
