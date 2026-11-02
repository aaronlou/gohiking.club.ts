import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { activityMembers } from "@/server/db/schema";
import type { Activity, ActivityMember, Photo } from "@/server/db/schema";

export async function getMembership(
  activityId: string,
  userId: string | null | undefined,
): Promise<ActivityMember | null> {
  if (!userId) return null;
  const [row] = await db
    .select()
    .from(activityMembers)
    .where(
      and(eq(activityMembers.activityId, activityId), eq(activityMembers.userId, userId)),
    )
    .limit(1);
  return row ?? null;
}

export function isApprovedMembership(membership: ActivityMember | null | undefined) {
  return membership?.status === "approved";
}

export function isPublicPhoto(
  photo: Pick<Photo, "status" | "visibility">,
): boolean {
  return photo.status === "accepted" && photo.visibility === "public";
}

export function canManageActivity(activity: Pick<Activity, "hostId">, userId: string | null | undefined) {
  return Boolean(userId && activity.hostId === userId);
}

/**
 * Single source of truth for photo visibility. Every surface that exposes a
 * photo — the API image route, the detail page, OG metadata — must use this.
 */
export async function canViewPhotoRecord(
  photo: Pick<Photo, "id" | "userId" | "status" | "visibility" | "activityId">,
  viewerId: string | null | undefined,
): Promise<boolean> {
  if (isPublicPhoto(photo)) return true;
  if (viewerId && photo.userId === viewerId) return true;
  if (photo.visibility !== "activity" || !photo.activityId || !viewerId) return false;
  const membership = await getMembership(photo.activityId, viewerId);
  return isApprovedMembership(membership);
}

export async function canUploadToActivity(activityId: string, userId: string) {
  const membership = await getMembership(activityId, userId);
  return isApprovedMembership(membership);
}
