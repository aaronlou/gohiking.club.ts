import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { z } from "zod";
import { db } from "./db";
import { account, session, user, verification } from "./db/schema";

const appUrl = process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "用户名至少 3 个字符")
  .max(20, "用户名最多 20 个字符")
  .regex(/^[a-zA-Z0-9_]+$/, "用户名只能使用字母、数字和下划线")
  .transform((value) => value.toLowerCase());

export const auth = betterAuth({
  appName: "山行档案",
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
    transaction: true,
  }),
  trustedOrigins: [appUrl, "http://localhost:3000", "http://127.0.0.1:3000"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
        unique: true,
        input: true,
        sortable: true,
        validator: {
          input: usernameSchema,
        },
      },
      bio: {
        type: "string",
        required: false,
        input: true,
        validator: {
          input: z.string().trim().max(280).optional(),
        },
      },
      homeBase: {
        type: "string",
        required: false,
        input: true,
        validator: {
          input: z.string().trim().max(40).optional(),
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 120,
  },
  advanced: {
    cookiePrefix: "gohiking",
    useSecureCookies:
      process.env.AUTH_SECURE_COOKIES === "true" ||
      (process.env.NODE_ENV === "production" && appUrl.startsWith("https://")),
  },
});

export type Auth = typeof auth;
