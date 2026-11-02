import Link from "next/link";
import { ActivityCover } from "@/components/activities/activity-cover";
import { ArrowUpRight } from "@/components/icons";
import { activityPhase, activityPhaseLabel, formatActivityRange } from "@/lib/activities";
import type { StudioChapter } from "@/server/studio/queries";

export function StudioActivityChapters({
  chapters,
  mode = "archive",
}: {
  chapters: StudioChapter[];
  mode?: "archive" | "upload";
}) {
  const isUpload = mode === "upload";

  if (chapters.length === 0) {
    return (
      <div className="studio-chapters-empty">
        <span className="studio-chapters-empty__mark">＋</span>
        <div>
          <h3>{isUpload ? "还没有可以放进照片的活动。" : "还没有一起走过的活动。"}</h3>
          <p>
            {isUpload
              ? "每一张照片都需要先归入一次活动。发起一次，或者申请加入别人的活动，通过之后再来。"
              : "发起一次，或者申请加入别人的活动；照片会在这里按活动收好。"}
          </p>
        </div>
        {isUpload && (
          <Link href="/activities/new" className="btn btn--ink btn--sm">
            发起一次活动
            <ArrowUpRight />
          </Link>
        )}
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
            href={
              isUpload
                ? `/studio/upload?activity=${encodeURIComponent(activity.slug)}`
                : `/activities/${activity.slug}`
            }
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
              {isUpload && (
                <span className="studio-chapter__cta">
                  放进这次活动
                  <ArrowUpRight />
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
