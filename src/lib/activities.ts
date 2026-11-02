import type { ActivityDto } from "@/server/activities/dto";

export const ACTIVITY_DIFFICULTIES = [
  { id: "easy", label: "轻松", latin: "EASY", note: "半天路程，爬升不多" },
  { id: "moderate", label: "适中", latin: "MODERATE", note: "一天路程，有些爬升" },
  { id: "hard", label: "偏难", latin: "HARD", note: "长距离或较大爬升" },
  { id: "expert", label: "高强度", latin: "EXPERT", note: "多日或技术路段" },
] as const;

export type ActivityDifficultyId = (typeof ACTIVITY_DIFFICULTIES)[number]["id"];

export function getDifficulty(id: string) {
  return (
    ACTIVITY_DIFFICULTIES.find((item) => item.id === id) ?? ACTIVITY_DIFFICULTIES[1]
  );
}

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  timeZone: "Asia/Shanghai",
});

const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
  weekday: "short",
  timeZone: "Asia/Shanghai",
});

function toDate(value: string) {
  return new Date(`${value}T12:00:00+08:00`);
}

export function formatActivityDate(value: string) {
  return dateFormatter.format(toDate(value));
}

export function activityDayParts(value: string) {
  const date = toDate(value);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1),
    weekday: weekdayFormatter.format(date),
  };
}

export function formatActivityRange(startDate: string, endDate: string | null) {
  if (!endDate || endDate === startDate) return formatActivityDate(startDate);
  return `${formatActivityDate(startDate)} — ${formatActivityDate(endDate)}`;
}

export function formatActivityRangeNumeric(startDate: string, endDate: string | null) {
  const start = toDate(startDate);
  const startLabel = `${String(start.getMonth() + 1).padStart(2, "0")}.${String(start.getDate()).padStart(2, "0")}`;
  if (!endDate || endDate === startDate) return startLabel;
  const end = toDate(endDate);
  return `${startLabel} — ${String(end.getMonth() + 1).padStart(2, "0")}.${String(end.getDate()).padStart(2, "0")}`;
}

export type ActivityPhase = "upcoming" | "ongoing" | "past" | "closed";

export function activityPhase(activity: Pick<ActivityDto, "startDate" | "endDate" | "status">): ActivityPhase {
  if (activity.status === "closed" || activity.status === "archived") return "closed";
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (activity.startDate > today) return "upcoming";
  const end = activity.endDate ?? activity.startDate;
  if (end >= today) return "ongoing";
  return "past";
}

export function activityPhaseLabel(phase: ActivityPhase) {
  if (phase === "upcoming") return "即将出发";
  if (phase === "ongoing") return "正在进行";
  if (phase === "past") return "已经走过";
  return "已结束";
}

export function activityPhotoDay(photo: { takenAt: string | null; createdAt: string }) {
  const date = new Date(photo.takenAt ?? photo.createdAt);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(date);
}

export function groupActivityPhotosByDay<T extends { takenAt: string | null; createdAt: string }>(
  photos: T[],
) {
  const groups = new Map<string, T[]>();
  for (const photo of photos) {
    const key = activityPhotoDay(photo);
    const list = groups.get(key) ?? [];
    list.push(photo);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([label, items]) => ({ label, photos: items }));
}
