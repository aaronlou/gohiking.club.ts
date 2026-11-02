import Link from "next/link";
import type { Metadata } from "next";
import { ActivityCard } from "@/components/activities/activity-card";
import { ArrowUpRight, LockIcon } from "@/components/icons";
import { activityPhase } from "@/lib/activities";
import { getCurrentUser } from "@/server/auth-session";
import { listPublicActivities, getHostPendingRequests, getMyActivities } from "@/server/activities/queries";
import type { ActivityDto } from "@/server/activities/dto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "活动",
  description:
    "一次同行的私密影像相册：申请加入、由发起人确认，只有同行者能看到照片；想公开时再由拍摄者自己决定。",
};

export default async function ActivitiesPage() {
  const user = await getCurrentUser();
  const [publicActivities, mine, requests] = await Promise.all([
    listPublicActivities(),
    user ? getMyActivities(user.id) : Promise.resolve([]),
    user ? getHostPendingRequests(user.id) : Promise.resolve([]),
  ]);

  const live = publicActivities.filter((item) => activityPhase(item) !== "past");
  const past = publicActivities.filter((item) => activityPhase(item) === "past");
  const myIds = new Set(mine.map((item) => item.activity.id));
  const discover = live.filter((item) => !myIds.has(item.id));
  const discoverPast = past.filter((item) => !myIds.has(item.id));
  const totalPhotos = publicActivities.reduce((sum, item) => sum + item.photoCount, 0);

  return (
    <div className="activities-page">
      <header className="page-hero activity-list-hero">
        <div className="page-hero__top shell">
          <span className="page-hero__crumb">INDEX 03 / ACTIVITIES</span>
          <span className="page-hero__crumb">GOHIKING.CLUB · FIELD ROLLS</span>
        </div>
        <div className="page-hero__main shell">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              WALK TOGETHER / 一起去过的山野
            </p>
            <h1>
              一起走的
              <br />
              <em>那几次山。</em>
            </h1>
          </div>
          <div className="page-hero__aside">
            <p>
              每一次同行都有自己的相册。申请加入、由发起人确认，只有走过的人能看到照片；
              想放进公共档案时，再由拍摄者自己决定。
            </p>
            <div className="page-hero__stats">
              <div>
                <strong>{String(publicActivities.length).padStart(2, "0")}</strong>
                <span>公开活动</span>
              </div>
              <div>
                <strong>{String(totalPhotos).padStart(2, "0")}</strong>
                <span>同行影像</span>
              </div>
              <div>
                <strong>3.0</strong>
                <span>公开邀请线</span>
              </div>
            </div>
            <div className="activity-list-hero__actions">
              <Link href="/activities/new" className="btn btn--ink">
                发起一次活动
                <ArrowUpRight />
              </Link>
              {user && (
                <Link href="/studio/activities" className="text-link">
                  我的活动
                  <ArrowUpRight />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="shell activity-list">
        {requests.length > 0 && (
          <div className="activity-inbox-banner">
            <span className="activity-inbox-banner__mark">!</span>
            <div>
              <strong>有 {requests.length} 份入队申请等着你。</strong>
              <p>确认之后，对方才能看到活动里的照片。</p>
            </div>
            <Link href="/studio/activities" className="text-link">
              去确认
              <ArrowUpRight />
            </Link>
          </div>
        )}

        {mine.length > 0 && (
          <section className="activity-list__section">
            <div className="activity-list__head">
              <div>
                <span className="mono">MY FIELD ROLLS / 我的活动</span>
                <h2>已经一起走过的</h2>
              </div>
              <Link href="/studio/activities" className="text-link">
                全部活动
                <ArrowUpRight />
              </Link>
            </div>
            <div className="activity-grid">
              {mine.slice(0, 3).map(({ activity }) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          </section>
        )}

        {discover.length > 0 && (
          <section className="activity-list__section">
            <div className="activity-list__head">
              <div>
                <span className="mono">OPEN CALLS / 正在招募</span>
                <h2>下一次，和谁一起走</h2>
              </div>
              <span className="activity-list__hint">活动信息公开，照片只给通过的人</span>
            </div>
            <div className="activity-grid">
              {discover.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          </section>
        )}

        {discoverPast.length > 0 && (
          <section className="activity-list__section">
            <div className="activity-list__head">
              <div>
                <span className="mono">PAST WALKS / 已经走过</span>
                <h2>留在山里的那几天</h2>
              </div>
            </div>
            <div className="activity-grid">
              {discoverPast.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          </section>
        )}

        {publicActivities.length === 0 && !user && (
          <section className="activity-list__empty">
            <span className="activity-list__empty-mark">
              <LockIcon />
            </span>
            <h2>第一场同行，还在等人发起。</h2>
            <p>
              发起一次活动，把同行的人请进来。照片只对通过的人可见，
              想公开时再由每个人自己决定。
            </p>
            <Link href="/activities/new" className="btn btn--ink">
              发起一次活动
              <ArrowUpRight />
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
