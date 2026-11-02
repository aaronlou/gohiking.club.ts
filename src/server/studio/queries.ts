import { and, avg, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { activities, activityMembers, photos, user } from "@/server/db/schema";
import { toActivityDto, type ActivityDto } from "@/server/activities/dto";

export type StudioChapter = {
  activity: ActivityDto;
  role: "host" | "member";
  myPhotoCount: number;
  myPublicCount: number;
};

export type StudioOverview = {
  totalPhotos: number;
  publicPhotos: number;
  standalonePhotos: number;
  activityPhotos: number;
  acceptedPhotos: number;
  rejectedPhotos: number;
  failedPhotos: number;
  unratedPhotos: number;
  likesReceived: number;
  averageScore: number;
  chapters: StudioChapter[];
};

export async function getStudioOverview(userId: string): Promise<StudioOverview> {
  const [totals] = await db
    .select({
      totalPhotos: count(),
      publicPhotos: sql<number>`count(*) filter (where ${photos.status} = 'accepted' and ${photos.visibility} = 'public')`,
      standalonePhotos: sql<number>`count(*) filter (where ${photos.activityId} is null)`,
      activityPhotos: sql<number>`count(*) filter (where ${photos.activityId} is not null)`,
      acceptedPhotos: sql<number>`count(*) filter (where ${photos.status} = 'accepted')`,
      rejectedPhotos: sql<number>`count(*) filter (where ${photos.status} = 'rejected')`,
      failedPhotos: sql<number>`count(*) filter (where ${photos.status} = 'failed')`,
      unratedPhotos: sql<number>`count(*) filter (where ${photos.status} = 'unrated')`,
      likesReceived: sql<number>`coalesce(sum(${photos.likeCount}), 0)::int`,
      averageScore: avg(photos.score),
    })
    .from(photos)
    .where(eq(photos.userId, userId));

  const activityRows = await db
    .select({
      activity: activities,
      host: user,
      role: activityMembers.role,
      memberCount: sql<number>`(select count(*)::int from ${activityMembers} where ${activityMembers.activityId} = ${activities.id} and ${activityMembers.status} = 'approved')`,
      photoCount: sql<number>`(select count(*)::int from ${photos} where ${photos.activityId} = ${activities.id} and ${photos.status} = 'accepted' and ${photos.visibility} in ('activity', 'public'))`,
    })
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

  const mine = await db
    .select({
      activityId: photos.activityId,
      total: count(),
      publicCount: sql<number>`count(*) filter (where ${photos.status} = 'accepted' and ${photos.visibility} = 'public')`,
    })
    .from(photos)
    .where(and(eq(photos.userId, userId), isNotNull(photos.activityId)))
    .groupBy(photos.activityId);

  const mineMap = new Map(
    mine.map((row) => [
      row.activityId,
      { total: Number(row.total), publicCount: Number(row.publicCount) },
    ]),
  );

  const chapters: StudioChapter[] = activityRows.map((row) => {
    const counts = mineMap.get(row.activity.id) ?? { total: 0, publicCount: 0 };
    return {
      activity: toActivityDto(row.activity, row.host, {
        memberCount: Number(row.memberCount),
        photoCount: Number(row.photoCount),
      }),
      role: row.role,
      myPhotoCount: counts.total,
      myPublicCount: counts.publicCount,
    };
  });

  return {
    totalPhotos: Number(totals?.totalPhotos ?? 0),
    publicPhotos: Number(totals?.publicPhotos ?? 0),
    standalonePhotos: Number(totals?.standalonePhotos ?? 0),
    activityPhotos: Number(totals?.activityPhotos ?? 0),
    acceptedPhotos: Number(totals?.acceptedPhotos ?? 0),
    rejectedPhotos: Number(totals?.rejectedPhotos ?? 0),
    failedPhotos: Number(totals?.failedPhotos ?? 0),
    unratedPhotos: Number(totals?.unratedPhotos ?? 0),
    likesReceived: Number(totals?.likesReceived ?? 0),
    averageScore: totals?.averageScore ? Number(totals.averageScore) : 0,
    chapters,
  };
}
