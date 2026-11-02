import { z } from "zod";
import { PHOTO_THEME_IDS } from "./constants";

const themeIds = PHOTO_THEME_IDS as [string, ...string[]];

export const photoUploadSchema = z.object({
  title: z.string().trim().max(80, "标题最多 80 个字").optional().default(""),
  caption: z.string().trim().max(600, "自述最多 600 个字").optional().default(""),
  theme: z.union([z.enum(themeIds), z.literal("auto")]).default("auto"),
  visibility: z.enum(["public", "private"]).default("public"),
  locationName: z.string().trim().max(80, "地点最多 80 个字").optional().default(""),
  takenAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  source: z.enum(["upload", "archive"]).default("upload"),
});

export type PhotoUploadInput = z.infer<typeof photoUploadSchema>;

export const registerSchema = z.object({
  email: z.email("请输入有效的邮箱地址"),
  password: z.string().min(8, "密码至少 8 位").max(128),
});

export const loginSchema = z.object({
  email: z.email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD");

export const activityCreateSchema = z
  .object({
    title: z.string().trim().min(2, "给这次活动一个名字").max(80),
    summary: z.string().trim().max(140, "一句话介绍最多 140 个字").optional().default(""),
    description: z.string().trim().max(2000, "活动说明最多 2000 个字").optional().default(""),
    region: z.string().trim().max(40, "地区最多 40 个字").optional().default(""),
    routeName: z.string().trim().max(60, "路线最多 60 个字").optional().default(""),
    meetingPoint: z.string().trim().max(120, "集合点最多 120 个字").optional().default(""),
    startDate: dateString,
    endDate: dateString.optional().or(z.literal("")).default(""),
    difficulty: z.enum(["easy", "moderate", "hard", "expert"]).default("moderate"),
    capacity: z.coerce.number().int().min(1).max(100).optional(),
    joinPolicy: z.enum(["approval", "open", "invite"]).default("approval"),
    visibility: z.enum(["listed", "unlisted", "private"]).default("listed"),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "结束日期不能早于出发日期",
    path: ["endDate"],
  });

export type ActivityCreateInput = z.infer<typeof activityCreateSchema>;

export const activityJoinSchema = z.object({
  note: z.string().trim().max(200, "留言最多 200 个字").optional().default(""),
});

export const activityInviteSchema = z.object({
  username: z.string().trim().min(3, "输入对方的用户名").max(20),
});
