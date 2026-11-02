import type { Metadata } from "next";
import { UploadActivityGate } from "@/components/upload/upload-activity-gate";
import { UploadStudio } from "@/components/upload/upload-studio";
import { getActivityBySlugForUpload } from "@/server/activities/queries";
import { getStudioOverview } from "@/server/studio/queries";
import { requireUser } from "@/server/auth-session";

export const metadata: Metadata = {
  title: "放进一张照片",
  description:
    "把照片放进一次徒步活动，逐张观看并打分；3 分以上进入活动相册，想公开到公共档案时再由拍摄者本人决定。",
};

export default async function StudioUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ activity?: string }>;
}) {
  const user = await requireUser("/studio/upload");
  const { activity: activitySlug } = await searchParams;
  const activity = activitySlug
    ? await getActivityBySlugForUpload(activitySlug, user.id)
    : null;

  if (!activity) {
    const { chapters } = await getStudioOverview(user.id);
    return (
      <div className="studio-upload-page">
        <UploadActivityGate
          chapters={chapters}
          invalidActivity={Boolean(activitySlug)}
        />
      </div>
    );
  }

  return (
    <div className="studio-upload-page">
      <header className="studio-head studio-head--compact">
        <div className="studio-head__meta">
          <span className="mono">STUDIO / ACTIVITY</span>
          <span className="mono">PRIVATE FIELD ROLL</span>
        </div>
        <div className="studio-head__main">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              ONE ROLL, ONE TRIP
            </p>
            <h1>
              把这次同行的
              <br />
              <em>山野，放进来。</em>
            </h1>
            <p className="studio-head__note">
              放进《{activity.title}》。我们会逐张观看；3 分以上进入这次活动的相册，
              没到的不会被保存。之后想公开，再由你本人决定。
            </p>
          </div>
          <div className="submit-rule">
            <span className="mono">THIS ROLL IS PRIVATE</span>
            <ol>
              <li><span>01</span> 逐张认真观看</li>
              <li><span>02</span> 3 分以上进入活动相册</li>
              <li><span>03</span> 没到 3 分，只留下建议</li>
              <li><span>04</span> 想公开时，再由你决定</li>
            </ol>
          </div>
        </div>
      </header>

      <UploadStudio
        activity={{ id: activity.id, slug: activity.slug, title: activity.title }}
      />
    </div>
  );
}
