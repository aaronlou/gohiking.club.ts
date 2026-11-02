import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, UploadIcon } from "@/components/icons";
import { StudioActivityChapters } from "@/components/studio/studio-activity-chapters";
import { StudioArchive } from "@/components/studio/studio-archive";
import { formatScore } from "@/lib/utils";
import { getHostPendingRequests } from "@/server/activities/queries";
import { requireUser } from "@/server/auth-session";
import { getStudioPhotos } from "@/server/photos/queries";
import { getStudioOverview } from "@/server/studio/queries";

export const metadata: Metadata = {
  title: "我的档案",
};

export default async function StudioDashboardPage() {
  const user = await requireUser("/studio");
  const [overview, photos, requests] = await Promise.all([
    getStudioOverview(user.id),
    getStudioPhotos(user.id),
    getHostPendingRequests(user.id),
  ]);

  const today = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Shanghai",
  }).format(new Date());

  const interrupted = photos.filter((photo) => photo.status === "failed").length;

  return (
    <div className="studio-dashboard">
      <header className="studio-head">
        <div className="studio-head__meta">
          <span className="mono">MY ARCHIVE / 我的档案</span>
          <span className="mono">{today}</span>
        </div>
        <div className="studio-head__main">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              PERSONAL FIELD ARCHIVE
            </p>
            <h1>
              你好，{user.name}。
              <br />
              <em>山里的光还在。</em>
            </h1>
            <p className="studio-head__note">
              这里收着你走过的山：一起同行的活动、单独放进来的照片，以及它们被看见的样子。
              活动相册只对同行者可见；想公开时，再由你决定。
            </p>
          </div>
          <div className="studio-head__actions">
            <Link href="/studio/upload" className="btn btn--ink">
              <UploadIcon />
              放进一张照片
            </Link>
            <Link href="/activities/new" className="btn btn--outline">
              发起活动
            </Link>
            <Link href={`/hikers/${user.username}`} className="text-link">
              查看公开档案
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </header>

      <section className="studio-stats">
        <div>
          <span className="mono">WALKS / 活动</span>
          <strong>{String(overview.chapters.length).padStart(2, "0")}</strong>
          <small>次一起走过</small>
        </div>
        <div>
          <span className="mono">PHOTOS / 照片</span>
          <strong>{String(overview.totalPhotos).padStart(2, "0")}</strong>
          <small>张留在档案里</small>
        </div>
        <div>
          <span className="mono">PUBLIC / 已公开</span>
          <strong>{String(overview.publicPhotos).padStart(2, "0")}</strong>
          <small>张被大家看见</small>
        </div>
        <div>
          <span className="mono">RESPECT / 收到敬意</span>
          <strong>{String(overview.likesReceived).padStart(2, "0")}</strong>
          <small>来自其他徒步者</small>
        </div>
      </section>

      {interrupted > 0 && (
        <div className="studio-alert">
          <span className="studio-alert__mark">!</span>
          <div>
            <strong>有 {interrupted} 张照片的观看被中断了。</strong>
            <p>
              它们没有被评分，也没有被否定。可以回到照片页再看一次，
              或者先放一放，等下一次有心情的时候。
            </p>
          </div>
          <Link href="#photos" className="text-link">
            去看看
            <ArrowUpRight />
          </Link>
        </div>
      )}

      <div className="studio-grid">
        <main className="studio-grid__main">
          <section className="studio-section" id="activities">
            <div className="studio-section-head">
              <div>
                <span className="mono">01 / MY WALKS</span>
                <h2>我的活动</h2>
              </div>
              <Link href="/studio/activities" className="text-link">
                全部活动
                <ArrowUpRight />
              </Link>
            </div>
            <StudioActivityChapters chapters={overview.chapters} />
          </section>

          <section className="studio-section" id="photos">
            <div className="studio-section-head">
              <div>
                <span className="mono">02 / PHOTO ARCHIVE</span>
                <h2>照片档案</h2>
              </div>
              <span className="studio-section-head__note">
                {overview.totalPhotos} 张 · 单独上传 {overview.standalonePhotos} 张
              </span>
            </div>
            <StudioArchive photos={photos} />
          </section>
        </main>

        <aside className="studio-grid__aside">
          {requests.length > 0 && (
            <div className="studio-standard-card studio-standard-card--alert">
              <span className="mono">REQUESTS / 入队申请</span>
              <p>
                有 {requests.length} 个人想加入你发起的活动。确认之后，对方才能看到活动里的照片。
              </p>
              <Link href="/studio/activities" className="text-link">
                去确认
                <ArrowUpRight />
              </Link>
            </div>
          )}

          <div className="studio-letter-card">
            <span className="mono">FROM THE TRAIL / 山野来信</span>
            <p>
              “你不需要每一张都拍得完美。愿意为一次日出早起，愿意把手机举起来，已经足够动人。”
            </p>
            <span className="studio-letter-card__sign">— 给还在路上的你</span>
          </div>

          <div className="studio-standard-card">
            <span className="mono">THE INVITATION / 公共档案邀请线</span>
            <div className="studio-standard-card__score">
              <strong>3.0</strong>
              <span>/ 5.0</span>
            </div>
            <p>
              活动里的照片不会自动公开。想放进公共档案时，由拍摄者本人在照片页决定；
              3 分是邀请线，不是对照片价值的判决。
            </p>
            <Link href="/#standard" className="text-link">
              看看我们如何观看
              <ArrowUpRight />
            </Link>
          </div>
        </aside>
      </div>

      <footer className="studio-foot-note">
        <span className="mono">A QUIET PLACE FOR LOUD LANDSCAPES</span>
        <p>
          你的档案目前平均分 {formatScore(overview.averageScore)}，公开了 {overview.publicPhotos} 张。
          {overview.totalPhotos > 0
            ? "保持你自己的观看就好。山野没有标准答案。"
            : "第一张照片，往往是最需要勇气放进来的那一张。慢慢来。"}
        </p>
      </footer>
    </div>
  );
}
