import { randomBytes } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import type { z } from "zod";
import type { activityCreateSchema } from "@/lib/validation";
import { db } from "@/server/db";
import { activities, activityMembers, user } from "@/server/db/schema";
import { canManageActivity } from "./access";

type ActivityCreateInput = z.infer<typeof activityCreateSchema>;

export class ActivityServiceError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ActivityServiceError";
    this.status = status;
    this.code = code;
  }
}

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "trip"}-${randomBytes(3).toString("hex")}`;
}

async function loadActivity(activityId: string) {
  const [row] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
  if (!row) throw new ActivityServiceError(404, "not_found", "没有找到这次活动");
  return row;
}

async function countApproved(activityId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(activityMembers)
    .where(
      and(eq(activityMembers.activityId, activityId), eq(activityMembers.status, "approved")),
    );
  return Number(row?.total ?? 0);
}

export async function createActivity(hostId: string, input: ActivityCreateInput) {
  if (input.endDate && input.endDate < input.startDate) {
    throw new ActivityServiceError(400, "invalid_dates", "结束日期不能早于出发日期");
  }

  const [activity] = await db
    .insert(activities)
    .values({
      slug: slugify(input.title),
      hostId,
      title: input.title,
      summary: input.summary || null,
      description: input.description || null,
      region: input.region || null,
      routeName: input.routeName || null,
      meetingPoint: input.meetingPoint || null,
      startDate: input.startDate,
      endDate: input.endDate || null,
      difficulty: input.difficulty,
      capacity: input.capacity ?? null,
      joinPolicy: input.joinPolicy,
      visibility: input.visibility,
    })
    .returning();

  if (!activity) throw new ActivityServiceError(500, "create_failed", "活动没有建立成功，请重试");

  await db.insert(activityMembers).values({
    activityId: activity.id,
    userId: hostId,
    role: "host",
    status: "approved",
    decidedAt: new Date(),
    decidedBy: hostId,
  });

  return activity;
}

export async function applyToActivity(activityId: string, userId: string, note?: string | null) {
  const activity = await loadActivity(activityId);
  if (activity.status !== "open") {
    throw new ActivityServiceError(409, "not_open", "这次活动目前不接受新的同行者");
  }

  const [existing] = await db
    .select()
    .from(activityMembers)
    .where(and(eq(activityMembers.activityId, activityId), eq(activityMembers.userId, userId)))
    .limit(1);

  if (existing?.status === "approved") {
    return { status: "approved" as const };
  }
  if (existing?.status === "pending") {
    return { status: "pending" as const };
  }
  if (existing?.status === "rejected") {
    throw new ActivityServiceError(409, "rejected", "这次申请没有通过，可以问问发起人");
  }
  if (activity.joinPolicy === "invite" || activity.visibility === "private") {
    throw new ActivityServiceError(403, "invite_only", "这次活动只接受发起人邀请");
  }

  if (activity.capacity && (await countApproved(activityId)) >= activity.capacity) {
    throw new ActivityServiceError(409, "full", "同行名额已经满了");
  }

  const status: "pending" | "approved" =
    activity.joinPolicy === "open" ? "approved" : "pending";
  const now = new Date();
  const values = {
    status,
    note: note?.slice(0, 200) || null,
    appliedAt: now,
    decidedAt: status === "approved" ? now : null,
    decidedBy: status === "approved" ? activity.hostId : null,
  };

  if (existing) {
    await db
      .update(activityMembers)
      .set(values)
      .where(eq(activityMembers.id, existing.id));
  } else {
    await db.insert(activityMembers).values({
      activityId,
      userId,
      role: "member",
      ...values,
    });
  }

  return { status };
}

export async function withdrawApplication(activityId: string, userId: string) {
  const [existing] = await db
    .select()
    .from(activityMembers)
    .where(and(eq(activityMembers.activityId, activityId), eq(activityMembers.userId, userId)))
    .limit(1);

  if (!existing || existing.status !== "pending") {
    throw new ActivityServiceError(409, "not_pending", "现在没有可以撤回的申请");
  }

  await db.delete(activityMembers).where(eq(activityMembers.id, existing.id));
  return { ok: true };
}

export async function decideMembership(
  activityId: string,
  hostId: string,
  memberId: string,
  action: "approve" | "reject",
) {
  const activity = await loadActivity(activityId);
  if (!canManageActivity(activity, hostId)) {
    throw new ActivityServiceError(403, "forbidden", "只有发起人可以审批申请");
  }

  const [member] = await db
    .select()
    .from(activityMembers)
    .where(and(eq(activityMembers.id, memberId), eq(activityMembers.activityId, activityId)))
    .limit(1);

  if (!member) throw new ActivityServiceError(404, "not_found", "没有找到这份申请");
  if (member.status !== "pending") {
    throw new ActivityServiceError(409, "already_decided", "这份申请已经处理过了");
  }
  if (action === "approve" && activity.capacity && (await countApproved(activityId)) >= activity.capacity) {
    throw new ActivityServiceError(409, "full", "同行名额已经满了");
  }

  await db
    .update(activityMembers)
    .set({
      status: action === "approve" ? "approved" : "rejected",
      decidedAt: new Date(),
      decidedBy: hostId,
    })
    .where(eq(activityMembers.id, memberId));

  return { status: action === "approve" ? "approved" : "rejected" };
}

export async function removeMember(activityId: string, actorId: string, memberId: string) {
  const activity = await loadActivity(activityId);
  const [member] = await db
    .select()
    .from(activityMembers)
    .where(and(eq(activityMembers.id, memberId), eq(activityMembers.activityId, activityId)))
    .limit(1);

  if (!member) throw new ActivityServiceError(404, "not_found", "没有找到这位同行者");
  if (member.role === "host") {
    throw new ActivityServiceError(409, "host", "发起人不能离开自己的活动");
  }

  const isHost = canManageActivity(activity, actorId);
  const isSelf = member.userId === actorId;
  if (!isHost && !isSelf) {
    throw new ActivityServiceError(403, "forbidden", "只有发起人可以做这个操作");
  }

  await db
    .update(activityMembers)
    .set({ status: isSelf ? "left" : "removed", decidedAt: new Date(), decidedBy: actorId })
    .where(eq(activityMembers.id, memberId));

  return { ok: true };
}

export async function inviteMember(activityId: string, hostId: string, username: string) {
  const activity = await loadActivity(activityId);
  if (!canManageActivity(activity, hostId)) {
    throw new ActivityServiceError(403, "forbidden", "只有发起人可以邀请同行者");
  }

  const [target] = await db
    .select()
    .from(user)
    .where(eq(user.username, username.trim().toLowerCase()))
    .limit(1);
  if (!target) throw new ActivityServiceError(404, "not_found", "没有找到这个用户名");
  if (target.id === hostId) {
    throw new ActivityServiceError(409, "self", "你已经是这次活动的发起人了");
  }

  const [existing] = await db
    .select()
    .from(activityMembers)
    .where(and(eq(activityMembers.activityId, activityId), eq(activityMembers.userId, target.id)))
    .limit(1);

  if (existing?.status === "approved") {
    return { ok: true, name: target.name };
  }

  if (activity.capacity && (await countApproved(activityId)) >= activity.capacity) {
    throw new ActivityServiceError(409, "full", "同行名额已经满了");
  }

  const now = new Date();
  if (existing) {
    await db
      .update(activityMembers)
      .set({
        status: "approved",
        role: "member",
        decidedAt: now,
        decidedBy: hostId,
      })
      .where(eq(activityMembers.id, existing.id));
  } else {
    await db.insert(activityMembers).values({
      activityId,
      userId: target.id,
      role: "member",
      status: "approved",
      decidedAt: now,
      decidedBy: hostId,
    });
  }

  return { ok: true, name: target.name };
}

export async function closeActivity(activityId: string, hostId: string, status: "open" | "closed") {
  const activity = await loadActivity(activityId);
  if (!canManageActivity(activity, hostId)) {
    throw new ActivityServiceError(403, "forbidden", "只有发起人可以修改活动状态");
  }
  await db
    .update(activities)
    .set({ status, updatedAt: new Date() })
    .where(eq(activities.id, activityId));
  return { status };
}
