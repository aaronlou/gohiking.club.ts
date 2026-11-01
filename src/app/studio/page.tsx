import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, UploadIcon } from "@/components/icons";
import { StudioArchive } from "@/components/studio/studio-archive";
import { formatDate, formatScore } from "@/lib/utils";
import { requireUser } from "@/server/auth-session";
import { getStudioPhotos, getStudioStats } from "@/server/photos/queries";

export const metadata: Metadata = {
  title: "我的山行档案",
};

export default async function StudioDashboardPage() {
  const user = await requireUser("/studio");
  const [photos, stats] = await Promise.all([
    getStudioPhotos(user.id),
    getStudioStats(user.id),
  ]);

  const today = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Shanghai",
  }).format(new Date());

  const latest = photos[0];

  return (
    <div className="studio-dashboard">
      <header className="studio-head">
        <div className="studio-head__meta">
          <span className="mono">STUDIO / 我的工作台</span>
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
              这里收着你走过的山。被大家看见的照片会进入公共山脊；还在等待的照片，
              也会先在这里陪你 24 小时，再轻轻放下。
            </p>
          </div>
          <div className="studio-head__actions">
            <Link href="/studio/upload" className="btn btn--ink">
              <UploadIcon />
              放进一张照片
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
          <span className="mono">ACCEPTED / 公共档案</span>
          <strong>{String(stats.accepted).padStart(2, "0")}</strong>
          <small>张被大家看见</small>
        </div>
        <div>
          <span className="mono">AVERAGE / 平均评分</span>
          <strong>{stats.averageScore ? stats.averageScore.toFixed(1) : "—"}</strong>
          <small>满分 5.0</small>
        </div>
        <div>
          <span className="mono">IN QUARANTINE / 暂存中</span>
          <strong>{String(stats.rejected).padStart(2, "0")}</strong>
          <small>先留给你 24 小时</small>
        </div>
        <div>
          <span className="mono">RESPECT / 收到敬意</span>
          <strong>{String(stats.likesReceived).padStart(2, "0")}</strong>
          <small>来自其他徒步者</small>
        </div>
      </section>

      {stats.rejected > 0 && (
        <div className="studio-alert">
          <span className="studio-alert__mark">!</span>
          <div>
            <strong>有 {stats.rejected} 张照片还在暂存区。</strong>
            <p>它们没有被公开，也没有被否定。只是这一次，还没找到最合适的位置。你可以看看手记，也可以随时提前删除。</p>
          </div>
          <Link href="#archive" className="text-link">
            看看这份手记
            <ArrowUpRight />
          </Link>
        </div>
      )}

      <div className="studio-grid">
        <section className="studio-grid__main" id="archive">
          <div className="studio-section-head">
            <div>
              <span className="mono">01 / RECENT FILES</span>
              <h2>最近的影像</h2>
            </div>
            {latest && (
              <span className="studio-section-head__note">
                最近一次放进档案 · {formatDate(latest.createdAt)}
              </span>
            )}
          </div>
          <StudioArchive photos={photos} />
        </section>

        <aside className="studio-grid__aside">
          <div className="studio-letter-card">
            <span className="mono">FROM THE TRAIL / 山野来信</span>
            <p>“你不需要每一张都拍得完美。愿意为一次日出早起，愿意把手机举起来，已经足够动人。”</p>
            <span className="studio-letter-card__sign">— 给还在路上的你</span>
          </div>

          <div className="studio-standard-card">
            <span className="mono">THE INVITATION / 公共档案邀请线</span>
            <div className="studio-standard-card__score">
              <strong>3.0</strong>
              <span>/ 5.0</span>
            </div>
            <p>3 分不是及格线，而是一张照片走进公共档案的邀请线。还没到 3 分的照片，也会收到一份具体的手记，先在你身边留 24 小时。</p>
            <Link href="/#standard" className="text-link">
              看看我们如何观看
              <ArrowUpRight />
            </Link>
          </div>

          {stats.evaluating > 0 || stats.failed > 0 ? (
            <div className="studio-standard-card studio-standard-card--alert">
              <span className="mono">A LITTLE MORE TIME</span>
              <p>
                还有 {stats.evaluating} 张照片在等待观看
                {stats.failed > 0 ? `，${stats.failed} 张的观看被中断了` : ""}。
                不着急，我们可以在左侧继续。
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      <footer className="studio-foot-note">
        <span className="mono">A QUIET PLACE FOR LOUD LANDSCAPES</span>
        <p>
          你的档案目前平均分 {formatScore(stats.averageScore)}。
          {stats.accepted > 0 ? "保持你自己的观看就好。山野没有标准答案。" : "第一张照片，往往是最需要勇气放进来的那一张。慢慢来。"}
        </p>
      </footer>
    </div>
  );
}
