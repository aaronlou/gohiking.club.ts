import Link from "next/link";
import type { Metadata } from "next";
import { CameraIllustration } from "@/components/camera/camera-illustration";
import { ArrowUpRight, CameraIcon, UploadIcon } from "@/components/icons";
import { StudioArchive } from "@/components/studio/studio-archive";
import { formatDate, formatScore } from "@/lib/utils";
import { getLatestCamera } from "@/server/cameras/service";
import { requireUser } from "@/server/auth-session";
import { getStudioPhotos, getStudioStats } from "@/server/photos/queries";

export const metadata: Metadata = {
  title: "我的山行档案",
};

export default async function StudioDashboardPage() {
  const user = await requireUser("/studio");
  const [photos, stats, camera] = await Promise.all([
    getStudioPhotos(user.id),
    getStudioStats(user.id),
    getLatestCamera(user.id),
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
              这里是你所有影像的归档处。入选的照片会进入公共山脊，未入选的会在 24 小时后离开。
            </p>
          </div>
          <div className="studio-head__actions">
            <Link href="/studio/upload" className="btn btn--ink">
              <UploadIcon />
              提交新照片
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
          <span className="mono">ACCEPTED / 已入选</span>
          <strong>{String(stats.accepted).padStart(2, "0")}</strong>
          <small>张进入公共档案</small>
        </div>
        <div>
          <span className="mono">AVERAGE / 平均评分</span>
          <strong>{stats.averageScore ? stats.averageScore.toFixed(1) : "—"}</strong>
          <small>满分 5.0</small>
        </div>
        <div>
          <span className="mono">IN QUARANTINE / 隔离中</span>
          <strong>{String(stats.rejected).padStart(2, "0")}</strong>
          <small>24 小时后自动清理</small>
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
            <strong>{stats.rejected} 张照片未入选，仍在隔离区。</strong>
            <p>它们不会被公开。你可以查看具体原因，也可以立即清理，不必等 24 小时。</p>
          </div>
          <Link href="#archive" className="text-link">
            查看未入选
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
                最近一次提交 · {formatDate(latest.createdAt)}
              </span>
            )}
          </div>
          <StudioArchive photos={photos} />
        </section>

        <aside className="studio-grid__aside">
          <div className="studio-camera-card">
            <div className="studio-camera-card__head">
              <span className="mono">YOUR FIELD CAMERA</span>
              <CameraIcon />
            </div>
            <CameraIllustration
              compact
              design={
                camera
                  ? {
                      name: camera.name,
                      bodyColor: camera.bodyColor,
                      accentColor: camera.accentColor,
                      lens: camera.lens,
                      filmStock: camera.filmStock,
                      strap: camera.strap,
                      engraving: camera.engraving,
                      serial: camera.serial,
                    }
                  : {
                      name: "未装配",
                      bodyColor: "bone",
                      accentColor: "#b34c2d",
                      lens: "field-35",
                      filmStock: "granite-100",
                      strap: "canvas",
                      engraving: "YOUR NAME HERE",
                      serial: "GH·26·—",
                    }
              }
            />
            <div className="studio-camera-card__spec">
              <div>
                <span>型号</span>
                <strong>{camera?.name ?? "等待装配"}</strong>
              </div>
              <div>
                <span>序列号</span>
                <strong>{camera?.serial ?? "—"}</strong>
              </div>
            </div>
            <Link href="/camera" className="btn btn--outline btn--full">
              {camera ? "进入相机工坊" : "造一台我的相机"}
              <ArrowUpRight />
            </Link>
          </div>

          <div className="studio-standard-card">
            <span className="mono">THE STANDARD / 入选标准</span>
            <div className="studio-standard-card__score">
              <strong>3.0</strong>
              <span>/ 5.0</span>
            </div>
            <p>低于 3 分的照片不会进入公共档案；但仍会得到一份具体的评审意见，并保留 24 小时供你查看。</p>
            <Link href="/#standard" className="text-link">
              阅读完整标准
              <ArrowUpRight />
            </Link>
          </div>

          {stats.evaluating > 0 || stats.failed > 0 ? (
            <div className="studio-standard-card studio-standard-card--alert">
              <span className="mono">ACTION NEEDED</span>
              <p>
                {stats.evaluating} 张照片尚未完成评审，
                {stats.failed > 0 ? ` ${stats.failed} 张评审中断。` : ""}
                可以在左侧继续评审。
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      <footer className="studio-foot-note">
        <span className="mono">A QUIET PLACE FOR LOUD LANDSCAPES</span>
        <p>
          你的档案目前平均分 {formatScore(stats.averageScore)}。
          {stats.accepted > 0 ? "继续保持你自己的观看，而不是山野的标准答案。" : "第一张照片，往往是最难交出去的那一张。"}
        </p>
      </footer>
    </div>
  );
}
