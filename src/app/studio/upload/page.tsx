import type { Metadata } from "next";
import { UploadStudio } from "@/components/upload/upload-studio";
import { getActivityBySlugForUpload } from "@/server/activities/queries";
import { requireUser } from "@/server/auth-session";

export const metadata: Metadata = {
  title: "放进一张照片",
  description: "放进一张户外徒步照片，让多模态视觉模型认真观看，并得到一份温柔、具体的中文手记。",
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

  return (
    <div className="studio-upload-page">
      <header className="studio-head studio-head--compact">
        <div className="studio-head__meta">
          <span className="mono">{activity ? "STUDIO / ACTIVITY" : "STUDIO / SUBMIT"}</span>
          <span className="mono">
            {activity ? "PRIVATE FIELD ROLL" : "AN INVITATION / 3.0"}
          </span>
        </div>
        <div className="studio-head__main">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              {activity ? "ONE ROLL, ONE TRIP" : "ONE PHOTO, ONE GENTLE LOOK"}
            </p>
            <h1>
              {activity ? "把这次同行的" : "把这一路的"}
              <br />
              <em>山野，放进来。</em>
            </h1>
            <p className="studio-head__note">
              {activity
                ? `放进《${activity.title}》。照片只对同行者可见，不会自动公开，也不用等待观看。`
                : "挑一张，或者一次放进最多 9 张。写下一点当时的风，我们会逐张认真看，并给每一张留下手记。"}
            </p>
          </div>
          <div className="submit-rule">
            <span className="mono">{activity ? "THIS ROLL IS PRIVATE" : "WHAT HAPPENS NEXT"}</span>
            <ol>
              {activity ? (
                <>
                  <li><span>01</span> 直接进入活动相册</li>
                  <li><span>02</span> 只对同行者可见</li>
                  <li><span>03</span> 想公开时，再请山野观看</li>
                  <li><span>04</span> 是否公开由你决定</li>
                </>
              ) : (
                <>
                  <li><span>01</span> 先只给你看</li>
                  <li><span>02</span> 认真看一遍</li>
                  <li><span>03</span> 3 分以上与大家见面</li>
                  <li><span>04</span> 没到时，只留下建议</li>
                </>
              )}
            </ol>
          </div>
        </div>
      </header>

      <UploadStudio
        activity={activity ? { id: activity.id, slug: activity.slug, title: activity.title } : null}
      />
    </div>
  );
}
