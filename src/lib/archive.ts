import { PHOTO_THEMES, getTheme } from "./constants";
import type { PhotoDto } from "@/server/photos/dto";

export type ThemeGroup = {
  id: string;
  label: string;
  latin: string;
  note: string;
  color: string;
  photos: PhotoDto[];
};

export type MonthGroup = {
  key: string;
  label: string;
  latin: string;
  photos: PhotoDto[];
};

export type AuthorGroup = {
  id: string;
  name: string;
  username: string;
  homeBase: string | null;
  photos: PhotoDto[];
  averageScore: number;
};

function photoDate(photo: PhotoDto) {
  return photo.takenAt ?? photo.acceptedAt ?? photo.createdAt;
}

export function groupPhotosByTheme(photos: PhotoDto[]): ThemeGroup[] {
  return PHOTO_THEMES.map((theme) => ({
    ...theme,
    photos: photos.filter((photo) => photo.theme === theme.id),
  })).filter((group) => group.photos.length > 0);
}

export function groupPhotosByMonth(photos: PhotoDto[]): MonthGroup[] {
  const groups = new Map<string, PhotoDto[]>();
  for (const photo of photos) {
    const date = new Date(photoDate(photo));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const current = groups.get(key) ?? [];
    current.push(photo);
    groups.set(key, current);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => {
      const [year, month] = key.split("-");
      return {
        key,
        label: `${year} 年 ${Number(month)} 月`,
        latin: `${year}.${month}`,
        photos: list.sort(
          (a, b) => new Date(photoDate(b)).getTime() - new Date(photoDate(a)).getTime(),
        ),
      };
    });
}

export function groupPhotosByAuthor(photos: PhotoDto[]): AuthorGroup[] {
  const groups = new Map<string, PhotoDto[]>();
  for (const photo of photos) {
    const current = groups.get(photo.author.id) ?? [];
    current.push(photo);
    groups.set(photo.author.id, current);
  }

  return [...groups.entries()]
    .map(([id, list]) => {
      const scores = list.map((photo) => photo.score ?? 0).filter(Boolean);
      return {
        id,
        name: list[0]?.author.name ?? "匿名徒步者",
        username: list[0]?.author.username ?? "unknown",
        homeBase: list[0]?.author.homeBase ?? null,
        photos: list,
        averageScore:
          scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
      };
    })
    .sort((a, b) => b.photos.length - a.photos.length || b.averageScore - a.averageScore);
}

export function themeCounts(photos: PhotoDto[]) {
  return PHOTO_THEMES.map((theme) => ({
    ...theme,
    count: photos.filter((photo) => photo.theme === theme.id).length,
  })).filter((theme) => theme.count > 0);
}

export function relatedPhotos(photo: PhotoDto, photos: PhotoDto[], limit = 4) {
  return photos
    .filter((item) => item.id !== photo.id)
    .sort((a, b) => {
      const aScore = (a.theme === photo.theme ? 10 : 0) + (a.author.id === photo.author.id ? 4 : 0);
      const bScore = (b.theme === photo.theme ? 10 : 0) + (b.author.id === photo.author.id ? 4 : 0);
      return bScore - aScore || (b.score ?? 0) - (a.score ?? 0);
    })
    .slice(0, limit);
}

export function themeOf(id: string) {
  return getTheme(id);
}
