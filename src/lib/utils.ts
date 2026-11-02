type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string" || typeof input === "number") {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(nested);
    } else {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(" ");
}

export function initials(name: string) {
  const clean = name.trim();
  if (!clean) return "GH";
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Shanghai",
});

const shortDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Shanghai",
});

const monthFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  timeZone: "Asia/Shanghai",
});

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "未记录";
  return dateFormatter.format(new Date(value));
}

export function formatShortDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return shortDateFormatter.format(new Date(value)).replace(/\//g, ".");
}

export function formatMonth(value: Date | string) {
  return monthFormatter.format(new Date(value));
}

export function formatMonthKey(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function relativeTime(value: Date | string) {
  const date = new Date(value).getTime();
  const diff = Date.now() - date;
  const minute = 60_000;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < day * 7) return `${Math.floor(diff / day)} 天前`;
  return formatShortDate(value);
}


export function formatScore(score: string | number | null | undefined) {
  if (score === null || score === undefined || score === "") return "—";
  const value = typeof score === "number" ? score : Number.parseFloat(score);
  if (Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

export function scoreVerdict(score: number) {
  if (score >= 4.5) return "编辑心头好";
  if (score >= 4) return "很打动我们";
  if (score >= 3) return "放进档案";
  return "还差一点";
}

export function padIndex(value: number, length = 2) {
  return String(value).padStart(length, "0");
}

export function profileHref(username: string) {
  return `/hikers/${encodeURIComponent(username)}`;
}

export function imageUrl(photoId: string, variant: "thumb" | "preview" | "full" = "preview", version?: string) {
  return `/api/photos/${photoId}/image?variant=${variant}${version ? `&v=${version}` : ""}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function plural(count: number, singular: string, pluralForm?: string) {
  return `${count} ${pluralForm ?? singular}`;
}

export function parseListParam(value: string | string[] | undefined) {
  if (!value) return [] as string[];
  return Array.isArray(value) ? value : value.split(",").filter(Boolean);
}

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/studio";
  return value;
}
