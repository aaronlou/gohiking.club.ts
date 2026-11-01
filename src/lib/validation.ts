import { z } from "zod";
import { PHOTO_THEME_IDS } from "./constants";

const themeIds = PHOTO_THEME_IDS as [string, ...string[]];

export const photoUploadSchema = z.object({
  title: z.string().trim().min(1, "给这张照片一个名字").max(80, "标题最多 80 个字"),
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

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "怎么称呼你？").max(30),
    username: z
      .string()
      .trim()
      .min(3, "用户名至少 3 个字符")
      .max(20, "用户名最多 20 个字符")
      .regex(/^[a-zA-Z0-9_]+$/, "用户名只能使用字母、数字和下划线"),
    email: z.email("请输入有效的邮箱地址"),
    password: z.string().min(8, "密码至少 8 位").max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});
