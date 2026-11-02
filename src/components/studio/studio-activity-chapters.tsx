import Link from "next/link";
import { ActivityCover } from "@/components/activities/activity-cover";
import { ArrowUpRight } from "@/components/icons";
import { activityPhase, activityPhaseLabel, formatActivityRange } from "@/lib/activities";
import type { StudioChapter } from "@/server/studio/queries";

export function StudioActivityChapters({ chapters }: { chapters: StudioChapter[] }) {
  if (chapters.length === 0) {
    return (
      <div className="studio-chapters-empty">
        <span className="studio-chapters-empty__mark">＋</span>
        <div>
          <h3>还没有一起走过的活动。</h3>
          <p>发起一次，或者申请加入别人的活动；照片会在这里按活动收好。</p>
        </div>
        <Link href="/activities" className="btn btn--outline btn--sm">
          去看看活动
          <ArrowUpRight />
        </Link>
      </div>
    );
  }

  return (
    <div className="studio-chapters">
      {chapters.map(({ activity, role, myPhotoCount, myPublicCount }) => {
        const phase = activityPhase(activity);
        return (
          <Link
            key={activity.id}
            href={`/activities/${activity.slug}`}
            className="studio-chapter"
          >
            <div className="studio-chapter__cover">
              <ActivityCover activity={activity} />
            </div>
            <div className="studio-chapter__body">
              <div className="studio-chapter__top">
                <span className={`activity-phase is-${phase}`}>
                  {activityPhaseLabel(phase)}
                </span>
                <span className="studio-chapter__role">
                  {role === "host" ? "我发起" : "我参与"}
                </span>
              </div>
              <h3>{activity.title}</h3>
              <p>
                {formatActivityRange(activity.startDate, activity.endDate)}
                {activity.region ? ` · ${activity.region}` : ""}
              </p>
              <div className="studio-chapter__foot">
                <span>
                  我的 {myPhotoCount} 张
                  {myPublicCount > 0 ? ` · 已公开 ${myPublicCount}` : ""}
                </span>
                <span>共享相册 {activity.photoCount} 张</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
