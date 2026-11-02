import { ContourField } from "@/components/contour-field";
import { activityDayParts, getDifficulty } from "@/lib/activities";
import { cn } from "@/lib/utils";
import type { ActivityDto } from "@/server/activities/dto";

export function ActivityCover({
  activity,
  large = false,
}: {
  activity: Pick<ActivityDto, "startDate" | "endDate" | "region" | "routeName" | "difficulty" | "coverColor">;
  large?: boolean;
}) {
  const { day, month, weekday } = activityDayParts(activity.startDate);
  const difficulty = getDifficulty(activity.difficulty);

  return (
    <div
      className={cn("activity-cover", large && "activity-cover--large")}
      style={activity.coverColor ? { backgroundColor: activity.coverColor } : undefined}
    >
      <ContourField className="activity-cover__contours" />
      <div className="activity-cover__top">
        <span>
          {month} 月 · {weekday}
        </span>
        <span>{difficulty.latin}</span>
      </div>
      <strong className="activity-cover__day">{day}</strong>
      <div className="activity-cover__bottom">
        <span>{activity.region ?? "山野"}</span>
        <span>{activity.routeName ?? "路线待定"}</span>
      </div>
    </div>
  );
}
