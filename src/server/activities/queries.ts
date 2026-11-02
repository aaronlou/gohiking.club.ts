import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { activities, activityMembers, photos, user } from "@/server/db/schema";
import { toPhotoDto, type PhotoDto } from "@/server/photos/dto";
import {
  canManageActivity,
  getMembership,
  isApprovedMembership,
} from "./access";
import {
  toActivityDto,
  toActivityMemberDto,
  type ActivityDto,
  type ActivityMemberDto,
} from "./dto";

const hostColumns = {
  id: user.id,
  name: user.name,
  username: user.username,
  homeBase: user.homeBase,
  bio: user.bio,
};

async function countMembers(activityId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(activityMembers)
    .where(
      and(eq(activityMembers.activityId, activityId), eq(activityMembers.status, "approved")),
    );
  return Number(row?.total ?? 0);
}

async function countPhotos(activityId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(photos)
    .where(
      and(
        eq(photos.activityId, activityId),
        eq(photos.status, "accepted"),
        inArray(photos.visibility, ["activity", "public"]),
      ),
    );
  return Number(row?.total ?? 0);
}

async function listActivityMembers(activityId: string): Promise<ActivityMemberDto[]> {
  const rows = await db
    .select({ member: activityMembers, user })
    .from(activityMembers)
    .innerJoin(user, eq(activityMembers.userId, user.id))
    .where(
      and(eq(activityMembers.activityId, activityId), eq(activityMembers.status, "approved")),
    )
    .orderBy(sql`${activityMembers.role} = 'host' desc`, asc(activityMembers.appliedAt));

  return rows.map((row) => toActivityMemberDto(row.member, row.user));
}

async function listPendingRequests(activityId: string): Promise<ActivityMemberDto[]> {
  const rows = await db
    .select({ member: activityMembers, user })
    .from(activityMembers)
    .innerJoin(user, eq(activityMembers.userId, user.id))
    .where(
      and(eq(activityMembers.activityId, activityId), eq(activityMembers.status, "pending")),
    )
    .orderBy(asc(activityMembers.appliedAt));

  return rows.map((row) => toActivityMemberDto(row.member, row.user));
}

export async function listActivityPhotos(
  activity: { id: string; slug: string; title: string },
  viewerId: string,
): Promise<PhotoDto[]> {
  const rows = await db
    .select({ photo: photos, author: user })
    .from(photos)
    .innerJoin(user, eq(photos.userId, user.id))
    .where(
      and(
        eq(photos.activityId, activity.id),
        eq(photos.status, "accepted"),
        inArray(photos.visibility, ["activity", "public"]),
      ),
    )
    .orderBy(asc(photos.takenAt), desc(photos.createdAt));

  return rows.map((row) =>
    toPhotoDto(row.photo, row.author, { activity }),
  );
}

export async function listPublicActivities(): Promise<ActivityDto[]> {
  const rows = await db
    .select({
      activity: activities,
      host: user,
      memberCount: sql<number>`(select count(*)::int from ${activityMembers} where ${activityMembers.activityId} = ${activities.id} and ${activityMembers.status} = 'approved')`,
      photoCount: sql<number>`(select count(*)::int from ${photos} where ${photos.activityId} = ${activities.id} and ${photos.status} = 'accepted' and ${photos.visibility} in ('activity', 'public'))`,
    })
    .from(activities)
    .innerJoin(user, eq(activities.hostId, user.id))
    .where(and(eq(activities.visibility, "listed"), ne(activities.status, "draft")))
    .orderBy(desc(activities.startDate))
    .limit(80);

  return rows.map((row) =>
    toActivityDto(row.activity, row.host, {
      memberCount: Number(row.memberCount),
      photoCount: Number(row.photoCount),
    }),
  );
}

export async function getActivityBySlug(slug: string, viewerId?: string | null) {
  const [row] = await db
    .select({ activity: activities, host: user })
    .from(activities)
    .innerJoin(user, eq(activities.hostId, user.id))
    .where(eq(activities.slug, slug))
    .limit(1);

  if (!row) return null;

  const membership = await getMembership(row.activity.id, viewerId);
  const isMember = isApprovedMembership(membership);
  const isHost = canManageActivity(row.activity, viewerId);

  // A private activity should not even reveal that it exists.
  if (row.activity.visibility === "private" && !isMember && !isHost) {
    return null;
  }

  const [memberCount, photoCount] = await Promise.all([
    countMembers(row.activity.id),
    countPhotos(row.activity.id),
  ]);

  const activity = toActivityDto(row.activity, row.host, {
    memberCount,
    photoCount,
    membership,
    canSeePrivate: isMember,
    ...(isHost ? { pendingCount: (await listPendingRequests(row.activity.id)).length } : {}),
  });

  const [activityPhotos, members, requests] = isMember
    ? await Promise.all([
        listActivityPhotos(row.activity, viewerId ?? ""),
        listActivityMembers(row.activity.id),
        isHost ? listPendingRequests(row.activity.id) : Promise.resolve([]),
      ])
    : [[], [], []];

  return {
    activity,
    photos: activityPhotos,
    members,
    requests,
    isMember,
    isHost,
  };
}

export async function getActivityForManage(slug: string, hostId: string) {
  const data = await getActivityBySlug(slug, hostId);
  if (!data || data.activity.host.id !== hostId) return null;
  return data;
}

export type MyActivity = {
  activity: ActivityDto;
  pendingCount: number;
};

export async function getMyActivities(userId: string): Promise<MyActivity[]> {
  const rows = await db
    .select({ activity: activities, host: user })
    .from(activityMembers)
    .innerJoin(activities, eq(activityMembers.activityId, activities.id))
    .innerJoin(user, eq(activities.hostId, user.id))
    .where(
      and(
        eq(activityMembers.userId, userId),
        eq(activityMembers.status, "approved"),
      ),
    )
    .orderBy(desc(activities.startDate));

  const pendingRows = await db
    .select({ activityId: activityMembers.activityId, total: count() })
    .from(activityMembers)
    .innerJoin(activities, eq(activityMembers.activityId, activities.id))
    .where(and(eq(activities.hostId, userId), eq(activityMembers.status, "pending")))
    .groupBy(activityMembers.activityId);

  const pendingMap = new Map(
    pendingRows.map((row) => [row.activityId, Number(row.total)]),
  );

  const result: MyActivity[] = [];
  for (const row of rows) {
    const [memberCount, photoCount] = await Promise.all([
      countMembers(row.activity.id),
      countPhotos(row.activity.id),
    ]);
    result.push({
      activity: toActivityDto(row.activity, row.host, {
        memberCount,
        photoCount,
        pendingCount: pendingMap.get(row.activity.id) ?? 0,
      }),
      pendingCount: pendingMap.get(row.activity.id) ?? 0,
    });
  }
  return result;
}

export async function getHostPendingRequests(userId: string) {
  const rows = await db
    .select({
      activity: activities,
      member: activityMembers,
      applicant: user,
    })
    .from(activityMembers)
    .innerJoin(activities, eq(activityMembers.activityId, activities.id))
    .innerJoin(user, eq(activityMembers.userId, user.id))
    .where(and(eq(activities.hostId, userId), eq(activityMembers.status, "pending")))
    .orderBy(desc(activityMembers.appliedAt))
    .limit(40);

  return rows.map((row) => ({
    activity: {
      id: row.activity.id,
      slug: row.activity.slug,
      title: row.activity.title,
      startDate: row.activity.startDate,
    },
    member: toActivityMemberDto(row.member, row.applicant),
  }));
}

export async function getActivityByIdForUpload(activityId: string, userId: string) {
  const [row] = await db
    .select({ activity: activities, host: user })
    .from(activities)
    .innerJoin(user, eq(activities.hostId, user.id))
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!row) return null;

  const membership = await getMembership(activityId, userId);
  if (!isApprovedMembership(membership)) return null;

  return {
    id: row.activity.id,
    slug: row.activity.slug,
    title: row.activity.title,
    startDate: row.activity.startDate,
    endDate: row.activity.endDate,
    status: row.activity.status,
  };
}

export async function getActivityBySlugForUpload(slug: string, userId: string) {
  const [row] = await db
    .select({ activity: activities })
    .from(activities)
    .where(eq(activities.slug, slug))
    .limit(1);
  if (!row) return null;

  const membership = await getMembership(row.activity.id, userId);
  if (!isApprovedMembership(membership)) return null;

  return {
    id: row.activity.id,
    slug: row.activity.slug,
    title: row.activity.title,
    status: row.activity.status,
  };
}

export async function getActivityPhotoCount(activityId: string) {
  return countPhotos(activityId);
}
