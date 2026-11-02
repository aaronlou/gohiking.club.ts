import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ActivityAlbum } from "@/components/activities/activity-album";
import { ActivityCover } from "@/components/activities/activity-cover";
import { JoinActivityButton } from "@/components/activities/join-activity-button";
import { ArrowUpRight, LockIcon } from "@/components/icons";
import {
  activityPhase,
  activityPhaseLabel,
  formatActivityRange,
  getDifficulty,
} from "@/lib/activities";
import { initials, profileHref } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth-session";
import { getActivityBySlug } from "@/server/activities/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getActivityBySlug(slug, null);
  if (!data) return { title: "活动" };
  return {
    title: data.activity.title,
    description:
      data.activity.summary ??
      `${formatActivityRange(data.activity.startDate, data.activity.endDate)} · 一次同行的山野影像相册。`,
    robots:
      data.activity.visibility === "listed" ? undefined : { index: false, follow: false },
  };
}

export default async function ActivityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await getCurrentUser();
  const data = await getActivityBySlug(slug, viewer?.id);
  if (!data) notFound();

  const { activity, photos, members, isMember, isHost } = data;
  const phase = activityPhase(activity);
  const difficulty = getDifficulty(activity.difficulty);
  const hostIsViewer = isHost;

  return (
    <article className="activity-page">
      <header className="activity-hero">
        <div className="page-hero__top shell">
          <Link href="/activities" className="page-hero__crumb">
            活动 / ALL WALKS
          </Link>
          <span className="page-hero__crumb">{activity.region ?? "GOHIKING FIELD ROLL"}</span>
        </div>

        <div className="shell activity-hero__grid">
          <div className="activity-hero__cover">
            <ActivityCover activity={activity} large />
          </div>

          <div className="activity-hero__copy">
            <div className="activity-hero__status">
              <span className={`activity-phase is-${phase}`}>{activityPhaseLabel(phase)}</span>
              <span>{formatActivityRange(activity.startDate, activity.endDate)}</span>
              <span>{difficulty.label}</span>
            </div>
            <h1>{activity.title}</h1>
            <p className="activity-hero__summary">
              {activity.summary ?? "这次山行还没有写下介绍，但相册已经开始等了。"}
            </p>

            <dl className="activity-hero__meta">
              <div>
                <dt>发起人</dt>
                <dd>
                  <Link href={profileHref(activity.host.username)}>{activity.host.name}</Link>
                </dd>
              </div>
              <div>
                <dt>同行</dt>
                <dd>{activity.memberCount} 人</dd>
              </div>
              <div>
                <dt>影像</dt>
                <dd>{activity.photoCount} 张</dd>
              </div>
              <div>
                <dt>路线</dt>
                <dd>{activity.routeName ?? "待定"}</dd>
              </div>
            </dl>

            <JoinActivityButton
              activityId={activity.id}
              slug={activity.slug}
              joinPolicy={activity.joinPolicy}
              activityStatus={activity.status}
              membershipStatus={activity.membership?.status ?? null}
              isMember={isMember}
              isHost={isHost}
              isLoggedIn={Boolean(viewer)}
            />

            {isHost && (activity.pendingCount ?? 0) > 0 && (
              <Link href={`/activities/${activity.slug}/manage`} className="activity-hero__pending">
                {activity.pendingCount} 份申请等你确认
                <ArrowUpRight />
              </Link>
            )}

            {!isMember && (
              <p className="activity-hero__privacy">
                <LockIcon />
                照片、成员名单与集合点只对通过申请的人可见。
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="shell activity-layout">
        <main className="activity-layout__main">
          <section className="activity-section">
            <div className="activity-section__head">
              <div>
                <span className="mono">FIELD ROLL / 同行相册</span>
                <h2>{isMember ? "这次带回来的光" : "一段只给同行者的相册"}</h2>
              </div>
              {isMember ? (
                <Link
                  href={`/studio/upload?activity=${encodeURIComponent(activity.slug)}`}
                  className="btn btn--ink btn--sm"
                >
                  放进一张照片
                  <ArrowUpRight />
                </Link>
              ) : (
                <span className="activity-section__count">{activity.photoCount} 张</span>
              )}
            </div>

            {isMember ? (
              <ActivityAlbum photos={photos} slug={activity.slug} />
            ) : (
              <div className="activity-locked">
                <span className="activity-locked__icon">
                  <LockIcon />
                </span>
                <div>
                  <h3>
                    {activity.photoCount > 0
                      ? `${activity.photoCount} 张照片，正在等同行的人。`
                      : "相册还空着，等同行的人先走进来。"}
                  </h3>
                  <p>
                    通过发起人的确认之后，这里的相册、成员名单和集合点就会打开。
                    照片不会自动公开到山野档案。
                  </p>
                </div>
              </div>
            )}
          </section>

          {isMember && activity.description && (
            <section className="activity-section activity-section--note">
              <div className="activity-section__head">
                <div>
                  <span className="mono">FIELD NOTE / 活动说明</span>
                  <h2>出发之前</h2>
                </div>
              </div>
              <p className="activity-note">{activity.description}</p>
            </section>
          )}
        </main>

        <aside className="activity-layout__side">
          <section className="activity-facts">
            <span className="mono">THE WALK / 这次山行</span>
            <dl>
              <div>
                <dt>日期</dt>
                <dd>{formatActivityRange(activity.startDate, activity.endDate)}</dd>
              </div>
              <div>
                <dt>地区</dt>
                <dd>{activity.region ?? "未标注"}</dd>
              </div>
              <div>
                <dt>路线</dt>
                <dd>{activity.routeName ?? "待定"}</dd>
              </div>
              <div>
                <dt>强度</dt>
                <dd>
                  {difficulty.label}
                  <small>{difficulty.note}</small>
                </dd>
              </div>
              <div>
                <dt>名额</dt>
                <dd>{activity.capacity ? `${activity.capacity} 人` : "不限"}</dd>
              </div>
              <div>
                <dt>集合点</dt>
                <dd>
                  {isMember ? activity.meetingPoint ?? "还没有写集合点" : "通过申请后可见"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="activity-host-card">
            <span className="mono">HOST / 发起人</span>
            <Link href={profileHref(activity.host.username)} className="activity-host-card__person">
              <span className="avatar">{initials(activity.host.name)}</span>
              <span>
                <strong>{activity.host.name}</strong>
                <small>
                  @{activity.host.username}
                  {activity.host.homeBase ? ` · ${activity.host.homeBase}` : ""}
                </small>
              </span>
              <ArrowUpRight />
            </Link>
            {activity.host.bio && <p>{activity.host.bio}</p>}
            {hostIsViewer && (
              <Link href={`/activities/${activity.slug}/manage`} className="text-link">
                管理申请与成员
                <ArrowUpRight />
              </Link>
            )}
          </section>

          {isMember && (
            <section className="activity-members">
              <div className="activity-members__head">
                <span className="mono">TOGETHER / 同行者</span>
                <span>{members.length}</span>
              </div>
              <ul>
                {members.map((member) => (
                  <li key={member.id}>
                    <Link href={profileHref(member.user.username)}>
                      <span className="avatar avatar--sm">{initials(member.user.name)}</span>
                      <span>
                        <strong>{member.user.name}</strong>
                        <small>
                          @{member.user.username}
                          {member.role === "host" ? " · 发起人" : ""}
                        </small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
