import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";
import { StudioActivityChapters } from "@/components/studio/studio-activity-chapters";
import type { StudioChapter } from "@/server/studio/queries";

export function UploadActivityGate({
  chapters,
  invalidActivity = false,
}: {
  chapters: StudioChapter[];
  invalidActivity?: boolean;
}) {
  return (
    <div className="upload-gate">
      <header className="studio-head studio-head--compact">
        <div className="studio-head__meta">
          <span className="mono">STUDIO / SUBMIT</span>
          <span className="mono">STEP 01 / ACTIVITY</span>
        </div>
        <div className="studio-head__main">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              ONE PHOTO, ONE TRIP
            </p>
            <h1>
              先选一次
              <br />
              <em>同行的活动。</em>
            </h1>
            <p className="studio-head__note">
              每一张照片都需要先归入一次徒步活动。选好之后，我们会逐张观看；
              3 分以上进入这次活动的相册，没到的不会被保存。以后想公开，再由你本人决定。
            </p>
          </div>
          <div className="studio-head__actions">
            <Link href="/activities/new" className="btn btn--ink">
              发起一次活动
              <ArrowUpRight />
            </Link>
            <Link href="/activities" className="text-link">
              去看看活动
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </header>

      {invalidActivity && (
        <div className="upload-gate__notice">
          <span className="upload-gate__notice-mark">!</span>
          <p>你没有加入这次活动，或者它已经不存在。先选一次你已通过的活动。</p>
        </div>
      )}

      <div className="upload-gate__list">
        <div className="upload-gate__head">
          <span className="mono">CHOOSE A FIELD ROLL / 选择活动</span>
          <span>{chapters.length} 次可放进</span>
        </div>
        <StudioActivityChapters chapters={chapters} mode="upload" />
      </div>
    </div>
  );
}
