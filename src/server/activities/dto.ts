import type { Activity, ActivityMember, User } from "@/server/db/schema";

export type ActivityHost = {
  id: string;
  name: string;
  username: string;
  homeBase: string | null;
  bio: string | null;
};

export type ActivityMembershipDto = {
  status: ActivityMember["status"];
  role: ActivityMember["role"];
  note: string | null;
  appliedAt: string;
};

export type ActivityDto = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  region: string | null;
  routeName: string | null;
  meetingPoint: string | null;
  startDate: string;
  endDate: string | null;
  difficulty: string;
  capacity: number | null;
  joinPolicy: Activity["joinPolicy"];
  visibility: Activity["visibility"];
  status: Activity["status"];
  coverMode: string;
  coverColor: string | null;
  coverKey: string | null;
  createdAt: string;
  host: ActivityHost;
  memberCount: number;
  photoCount: number;
  membership: ActivityMembershipDto | null;
  pendingCount?: number;
};

export type ActivityMemberDto = {
  id: string;
  role: ActivityMember["role"];
  status: ActivityMember["status"];
  note: string | null;
  appliedAt: string;
  user: ActivityHost;
};

export function toActivityHost(user: Pick<User, "id" | "name" | "username" | "homeBase" | "bio">): ActivityHost {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    homeBase: user.homeBase ?? null,
    bio: user.bio ?? null,
  };
}

export function toActivityDto(
  activity: Activity,
  host: Pick<User, "id" | "name" | "username" | "homeBase" | "bio">,
  options: {
    memberCount: number;
    photoCount: number;
    membership?: ActivityMember | null;
    pendingCount?: number;
    canSeePrivate?: boolean;
  },
): ActivityDto {
  return {
    id: activity.id,
    slug: activity.slug,
    title: activity.title,
    summary: activity.summary,
    description: activity.description,
    region: activity.region,
    routeName: activity.routeName,
    meetingPoint: options.canSeePrivate ? activity.meetingPoint : null,
    startDate: activity.startDate,
    endDate: activity.endDate,
    difficulty: activity.difficulty,
    capacity: activity.capacity,
    joinPolicy: activity.joinPolicy,
    visibility: activity.visibility,
    status: activity.status,
    coverMode: activity.coverMode,
    coverColor: activity.coverColor,
    coverKey: activity.coverKey,
    createdAt: new Date(activity.createdAt).toISOString(),
    host: toActivityHost(host),
    memberCount: options.memberCount,
    photoCount: options.photoCount,
    membership: options.membership
      ? {
          status: options.membership.status,
          role: options.membership.role,
          note: options.membership.note,
          appliedAt: new Date(options.membership.appliedAt).toISOString(),
        }
      : null,
    ...(options.pendingCount === undefined ? {} : { pendingCount: options.pendingCount }),
  };
}

export function toActivityMemberDto(
  member: ActivityMember,
  user: Pick<User, "id" | "name" | "username" | "homeBase" | "bio">,
): ActivityMemberDto {
  return {
    id: member.id,
    role: member.role,
    status: member.status,
    note: member.note,
    appliedAt: new Date(member.appliedAt).toISOString(),
    user: toActivityHost(user),
  };
}
