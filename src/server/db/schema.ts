import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ──────────────────────────────────────────────────────────────────────────
 * Auth domain — Better Auth compatible tables
 * ────────────────────────────────────────────────────────────────────────── */

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    username: text("username").notNull(),
    bio: text("bio"),
    homeBase: text("home_base"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_email_unique").on(table.email),
    uniqueIndex("user_username_unique").on(table.username),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

/* ──────────────────────────────────────────────────────────────────────────
 * Archive domain
 * ────────────────────────────────────────────────────────────────────────── */

export const photoStatus = pgEnum("photo_status", [
  "evaluating",
  "accepted",
  "rejected",
  "failed",
]);

export const photoVisibility = pgEnum("photo_visibility", ["public", "private"]);

export const photos = pgTable(
  "photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    caption: text("caption"),
    status: photoStatus("status").default("evaluating").notNull(),
    visibility: photoVisibility("visibility").default("public").notNull(),
    theme: text("theme").notNull().default("trail"),
    score: numeric("score", { precision: 2, scale: 1 }),
    aiSummary: text("ai_summary"),
    aiStrengths: jsonb("ai_strengths").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    aiImprovements: jsonb("ai_improvements").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    aiTags: jsonb("ai_tags").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    aiModel: text("ai_model"),
    aiProvider: text("ai_provider"),
    aiTheme: text("ai_theme"),
    takenAt: timestamp("taken_at", { withTimezone: true }),
    locationName: text("location_name"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    cameraModel: text("camera_model"),
    lensModel: text("lens_model"),
    aperture: text("aperture"),
    shutterSpeed: text("shutter_speed"),
    iso: integer("iso"),
    focalLength: text("focal_length"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    fileKey: text("file_key"),
    thumbKey: text("thumb_key"),
    blurData: text("blur_data"),
    dominantColor: text("dominant_color"),
    source: text("source").default("upload").notNull(),
    creditName: text("credit_name"),
    creditUrl: text("credit_url"),
    featured: boolean("featured").default(false).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("photos_user_id_idx").on(table.userId),
    index("photos_status_idx").on(table.status),
    index("photos_accepted_at_idx").on(table.acceptedAt),
    index("photos_theme_idx").on(table.theme),
    index("photos_created_at_idx").on(table.createdAt),
  ],
);

export const likes = pgTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    photoId: uuid("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.photoId] }),
    index("likes_photo_id_idx").on(table.photoId),
  ],
);

/* ──────────────────────────────────────────────────────────────────────────
 * Relations (used by typed relational queries)
 * ────────────────────────────────────────────────────────────────────────── */

export const userRelations = relations(user, ({ many }) => ({
  photos: many(photos),
  likes: many(likes),
}));

export const photoRelations = relations(photos, ({ one, many }) => ({
  author: one(user, { fields: [photos.userId], references: [user.id] }),
  likes: many(likes),
}));

export const likeRelations = relations(likes, ({ one }) => ({
  user: one(user, { fields: [likes.userId], references: [user.id] }),
  photo: one(photos, { fields: [likes.photoId], references: [photos.id] }),
}));

export type User = typeof user.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
