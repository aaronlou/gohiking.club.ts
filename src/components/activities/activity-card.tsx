import Link from "next/link";
import { activityPhase, activityPhaseLabel, formatActivityRange } from "@/lib/activities";
import type { ActivityDto } from "@/server/activities/dto";
import { ActivityCover } from "./activity-cover";

export function ActivityCard({ activity }: { activity: ActivityDto }) {
  const phase = activityPhase(activity);

  return (
    <Link href={`/activities/${activity.slug}`} className="activity-card">
      <ActivityCover activity={activity} />
      <div className="activity-card__body">
        <div className="activity-card__top">
          <span className={`activity-phase is-${phase}`}>{activityPhaseLabel(phase)}</span>
          <span className="activity-card__count">{activity.memberCount} 人同行</span>
        </div>
        <h3>{activity.title}</h3>
        <p className="activity-card__summary">{activity.summary ?? "一次还没有写下介绍的山行。"}</p>
        <div className="activity-card__foot">
          <span>{formatActivityRange(activity.startDate, activity.endDate)}</span>
          <span>{activity.photoCount > 0 ? `${activity.photoCount} 张影像` : "相册还空着"}</span>
        </div>
      </div>
    </Link>
  );
}
