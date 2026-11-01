import { and, avg, count, countDistinct, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { likes, photos, user } from "@/server/db/schema";
import { toPhotoDto, type PhotoDto } from "./dto";

const authorColumns = {
  id: user.id,
  name: user.name,
  username: user.username,
  homeBase: user.homeBase,
  bio: user.bio,
};

type Viewer = string | null | undefined;

function publicPhotoCondition() {
  return and(eq(photos.status, "accepted"), eq(photos.visibility, "public"));
}

async function attachLikes(rows: { photo: typeof photos.$inferSelect; author: typeof user.$inferSelect }[], viewerId: Viewer) {
  if (!viewerId || rows.length === 0) {
    return rows.map(({ photo, author }) => toPhotoDto(photo, author));
  }
  const liked = await db
    .select({ photoId: likes.photoId })
    .from(likes)
    .where(
      and(
        eq(likes.userId, viewerId),
        inArray(likes.photoId, rows.map(({ photo }) => photo.id)),
      ),
    );
  const likedSet = new Set(liked.map((item) => item.photoId));
  return rows.map(({ photo, author }) =>
    toPhotoDto(photo, author, { liked: likedSet.has(photo.id) }),
  );
}

export async function getFeaturedPhotos(limit = 5, viewerId?: Viewer): Promise<PhotoDto[]> {
  const rows = await db
    .select({ photo: photos, author: user })
    .from(photos)
    .innerJoin(user, eq(photos.userId, user.id))
    .where(publicPhotoCondition())
    .orderBy(desc(photos.featured), desc(photos.score), desc(photos.acceptedAt))
    .limit(limit);

  return attachLikes(
    rows.map((row) => ({ photo: row.photo, author: row.author })),
    viewerId,
  );
}

export async function listPublicPhotos(options: {
  limit?: number;
  offset?: number;
  theme?: string;
  authorId?: string;
  viewerId?: string | null;
} = {}): Promise<PhotoDto[]> {
  const conditions = [publicPhotoCondition()];
  if (options.theme) conditions.push(eq(photos.theme, options.theme));
  if (options.authorId) conditions.push(eq(photos.userId, options.authorId));

  const rows = await db
    .select({ photo: photos, author: user })
    .from(photos)
    .innerJoin(user, eq(photos.userId, user.id))
    .where(and(...conditions))
    .orderBy(desc(photos.featured), desc(photos.acceptedAt), desc(photos.createdAt))
    .limit(options.limit ?? 24)
    .offset(options.offset ?? 0);

  return attachLikes(
    rows.map((row) => ({ photo: row.photo, author: row.author })),
    options.viewerId,
  );
}

export async function getPublicStats() {
  const [photoStats, authorStats, memberStats] = await Promise.all([
    db
      .select({
        total: count(),
        average: avg(photos.score),
      })
      .from(photos)
      .where(publicPhotoCondition()),
    db
      .select({ total: countDistinct(photos.userId) })
      .from(photos)
      .where(publicPhotoCondition()),
    db.select({ total: count() }).from(user),
  ]);

  return {
    accepted: Number(photoStats[0]?.total ?? 0),
    averageScore: photoStats[0]?.average ? Number(photoStats[0].average) : 0,
    photographers: Number(authorStats[0]?.total ?? 0),
    members: Number(memberStats[0]?.total ?? 0),
  };
}

export async function getPhotoById(id: string, viewerId: Viewer): Promise<PhotoDto | null> {
  const [row] = await db
    .select({ photo: photos, author: user })
    .from(photos)
    .innerJoin(user, eq(photos.userId, user.id))
    .where(eq(photos.id, id))
    .limit(1);

  if (!row) return null;

  const isOwner = viewerId === row.photo.userId;
  const isPublic = row.photo.status === "accepted" && row.photo.visibility === "public";

  if (!isPublic && !isOwner) {
    return null;
  }

  const [dto] = await attachLikes([row], viewerId);
  return dto ?? null;
}

export async function getPhotosByUsername(username: string, viewerId?: Viewer) {
  const [profile] = await db.select().from(user).where(eq(user.username, username)).limit(1);
  if (!profile) return null;

  const isOwner = viewerId === profile.id;
  const list = await listPublicPhotos({ authorId: profile.id, limit: 60, viewerId });
  const stats = await getAuthorStats(profile.id);

  return {
    profile: {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      bio: profile.bio,
      homeBase: profile.homeBase,
      image: profile.image,
      createdAt: profile.createdAt,
    },
    photos: list,
    stats,
    isOwner,
  };
}

export async function getAuthorStats(userId: string) {
  const [row] = await db
    .select({
      accepted: count(),
      average: avg(photos.score),
      likes: sql<number>`coalesce(sum(${photos.likeCount}), 0)::int`,
    })
    .from(photos)
    .where(and(eq(photos.userId, userId), eq(photos.status, "accepted"), eq(photos.visibility, "public")));

  return {
    accepted: Number(row?.accepted ?? 0),
    averageScore: row?.average ? Number(row.average) : 0,
    likes: Number(row?.likes ?? 0),
  };
}

export async function getStudioPhotos(userId: string): Promise<PhotoDto[]> {
  const rows = await db
    .select({ photo: photos, author: user })
    .from(photos)
    .innerJoin(user, eq(photos.userId, user.id))
    .where(eq(photos.userId, userId))
    .orderBy(desc(photos.createdAt))
    .limit(80);

  return attachLikes(
    rows.map((row) => ({ photo: row.photo, author: row.author })),
    userId,
  );
}

export async function getStudioStats(userId: string) {
  const [accepted, evaluating, rejected, failed, likesReceived] = await Promise.all([
    db
      .select({ total: count(), average: avg(photos.score) })
      .from(photos)
      .where(and(eq(photos.userId, userId), eq(photos.status, "accepted"))),
    db
      .select({ total: count() })
      .from(photos)
      .where(and(eq(photos.userId, userId), eq(photos.status, "evaluating"))),
    db
      .select({ total: count() })
      .from(photos)
      .where(and(eq(photos.userId, userId), eq(photos.status, "rejected"))),
    db
      .select({ total: count() })
      .from(photos)
      .where(and(eq(photos.userId, userId), eq(photos.status, "failed"))),
    db
      .select({ total: sql<number>`coalesce(sum(${photos.likeCount}), 0)::int` })
      .from(photos)
      .where(eq(photos.userId, userId)),
  ]);

  return {
    accepted: Number(accepted[0]?.total ?? 0),
    averageScore: accepted[0]?.average ? Number(accepted[0].average) : 0,
    evaluating: Number(evaluating[0]?.total ?? 0),
    rejected: Number(rejected[0]?.total ?? 0),
    failed: Number(failed[0]?.total ?? 0),
    likesReceived: Number(likesReceived[0]?.total ?? 0),
  };
}

export async function countRecentUploads(userId: string, hours = 1) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const [row] = await db
    .select({ total: count() })
    .from(photos)
    .where(and(eq(photos.userId, userId), gte(photos.createdAt, since)));
  return Number(row?.total ?? 0);
}

export async function getArchiveData(viewerId?: Viewer) {
  const all = await listPublicPhotos({ limit: 160, viewerId });
  return all;
}

export async function getThisWeekPhotos(limit = 6, viewerId?: Viewer) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ photo: photos, author: user })
    .from(photos)
    .innerJoin(user, eq(photos.userId, user.id))
    .where(and(publicPhotoCondition(), gte(photos.acceptedAt, weekAgo)))
    .orderBy(desc(photos.score))
    .limit(limit);

  if (rows.length > 0) {
    return attachLikes(rows, viewerId);
  }
  return listPublicPhotos({ limit, viewerId });
}

export async function getOlderThan(days: number, status: "accepted" | "rejected") {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({ id: photos.id })
    .from(photos)
    .where(and(eq(photos.status, status), lt(photos.createdAt, cutoff)))
    .limit(10);
}

export { authorColumns };
