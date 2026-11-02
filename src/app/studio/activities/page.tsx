import Link from "next/link";
import type { Metadata } from "next";
import { ActivityCard } from "@/components/activities/activity-card";
import { ArrowUpRight, CompassIcon } from "@/components/icons";
import { formatActivityRange } from "@/lib/activities";
import { initials } from "@/lib/utils";
import { requireUser } from "@/server/auth-session";
import { getHostPendingRequests, getMyActivities } from "@/server/activities/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "活动管理",
  robots: { index: false, follow: false },
};

export default async function StudioActivitiesPage() {
  const user = await requireUser("/studio/activities");
  const [mine, requests] = await Promise.all([
    getMyActivities(user.id),
    getHostPendingRequests(user.id),
  ]);

  const hosted = mine.filter(({ activity }) => activity.host.id === user.id);
  const joined = mine.filter(({ activity }) => activity.host.id !== user.id);

  return (
    <div className="studio-activities">
      <header className="studio-head studio-head--compact">
        <div className="studio-head__meta">
          <span className="mono">STUDIO / ACTIVITIES</span>
          <span className="mono">FIELD ROLLS</span>
        </div>
        <div className="studio-head__main">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              WALKS YOU CARRY
            </p>
            <h1>
              我参与过的
              <br />
              <em>那几次同行。</em>
            </h1>
            <p className="studio-head__note">
              活动相册只对同行者可见。想公开某一张时，再由拍摄者自己决定。
            </p>
          </div>
          <div className="studio-head__actions">
            <Link href="/activities/new" className="btn btn--ink">
              发起一次活动
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </header>

      {requests.length > 0 && (
        <section className="studio-requests">
          <div className="studio-requests__head">
            <div>
              <span className="mono">REQUESTS / 入队申请</span>
              <h2>{requests.length} 个人想和你一起走</h2>
            </div>
            <CompassIcon />
          </div>
          <ul>
            {requests.map((request) => (
              <li key={request.member.id}>
                <span className="avatar avatar--sm">{initials(request.member.user.name)}</span>
                <div>
                  <strong>{request.member.user.name}</strong>
                  <small>
                    申请加入《{request.activity.title}》 ·{" "}
                    {formatActivityRange(request.activity.startDate, null)}
                  </small>
                </div>
                <Link href={`/activities/${request.activity.slug}/manage`} className="text-link">
                  去确认
                  <ArrowUpRight />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="studio-activities__section">
        <div className="studio-section-head">
          <div>
            <span className="mono">01 / HOSTED</span>
            <h2>我发起的</h2>
          </div>
          <span className="studio-section-head__note">{hosted.length} 次</span>
        </div>
        {hosted.length > 0 ? (
          <div className="activity-grid">
            {hosted.map(({ activity }) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <p className="studio-activities__empty">
            还没有发起过活动。建一个，把同行的人请进来。
          </p>
        )}
      </section>

      <section className="studio-activities__section">
        <div className="studio-section-head">
          <div>
            <span className="mono">02 / JOINED</span>
            <h2>我参与的</h2>
          </div>
          <span className="studio-section-head__note">{joined.length} 次</span>
        </div>
        {joined.length > 0 ? (
          <div className="activity-grid">
            {joined.map(({ activity }) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <p className="studio-activities__empty">
            还没有加入别人的活动。去活动页看看，或者问问朋友最近走哪条线。
          </p>
        )}
      </section>
    </div>
  );
}
