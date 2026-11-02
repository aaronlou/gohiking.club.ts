import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DeletePhotoButton } from "@/components/delete-photo-button";
import { ArrowUpRight, LockIcon, QuoteMark } from "@/components/icons";
import { LikeButton } from "@/components/like-button";
import { PhotoCard } from "@/components/photo-card";
import { PhotoViewer } from "@/components/photo-viewer";
import { relatedPhotos } from "@/lib/archive";
import { SCORE_RUBRIC, getTheme } from "@/lib/constants";
import {
  countdownLabel,
  formatDate,
  formatScore,
  initials,
  profileHref,
  scoreVerdict,
} from "@/lib/utils";
import { getCurrentUser } from "@/server/auth-session";
import { getArchiveData, getPhotoById } from "@/server/photos/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const photo = await getPhotoById(id, null);
  if (!photo) return { title: "影像档案" };
  return {
    title: photo.title,
    description: photo.summary ?? `${photo.author.name} 的山野影像。`,
    openGraph: {
      title: `${photo.title} · 山行档案`,
      description: photo.summary ?? undefined,
      images: photo.previewUrl,
    },
  };
}

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const photo = await getPhotoById(id, viewer?.id);
  if (!photo) notFound();

  const [archive] = await Promise.all([getArchiveData(viewer?.id)]);
  const related = relatedPhotos(photo, archive, 3);
  const theme = getTheme(photo.theme);
  const isOwner = viewer?.id === photo.author.id;
  const isRejected = photo.status === "rejected";
  const isPending = photo.status === "evaluating" || photo.status === "failed";
  const isPrivate = photo.visibility === "private";
  const score = photo.score ?? 0;

  return (
    <article className="photo-page">
      {isRejected && (
        <div className="quarantine-banner">
          <div className="shell quarantine-banner__inner">
            <div>
              <span className="quarantine-banner__label">A LITTLE MORE TIME / 先留在你身边</span>
              <p>
                这张照片这次没有走进公共档案。不是它不够好，只是还需要一点时间。
                它会先留在只给你看的暂存区。<strong>{countdownLabel(photo.expiresAt)}自动移除。</strong>
              </p>
            </div>
            <div className="quarantine-banner__actions">
              <DeletePhotoButton photoId={photo.id} label="提前删除" />
            </div>
          </div>
        </div>
      )}

      {isPending && (
        <div className="quarantine-banner quarantine-banner--pending">
          <div className="shell quarantine-banner__inner">
            <div>
              <span className="quarantine-banner__label">IN REVIEW / 正在观看</span>
              <p>我们还没有看完这张照片。回到工作室可以继续，也可以让它先安静地待着。</p>
            </div>
            <Link href="/studio" className="btn btn--outline">
              回到工作室
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      )}

      <div className="photo-page__crumb shell">
        <Link href="/archive">影像档案</Link>
        <span>/</span>
        <span>{theme.label}</span>
        <span>/</span>
        <span>{photo.title}</span>
        {isPrivate && (
          <span className="private-mark">
            <LockIcon /> 仅自己可见
          </span>
        )}
      </div>

      <div className="photo-page__layout shell">
        <div className="photo-page__visual">
          <PhotoViewer
            photo={photo}
            themeLabel={theme.label}
            themeLatin={theme.latin}
            dateLabel={formatDate(photo.takenAt)}
          />
          <div className="photo-page__under">
            <p>
              {photo.caption || "这张照片没有留下文字，但画面已经把当时的风说了一些。"}
            </p>
            {photo.creditName && (
              <a
                href={photo.creditUrl ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
                className="photo-credit"
              >
                IMAGE CREDIT / {photo.creditName}
                <ArrowUpRight />
              </a>
            )}
          </div>
        </div>

        <aside className="photo-page__panel">
          <div className="photo-page__panel-inner">
            <div className="photo-score">
              <div className="photo-score__top">
                <span className="eyebrow">
                  <span className="dot" />
                  WATCH NOTE / 观看分
                </span>
                <span className={`score-state ${isRejected ? "is-rejected" : ""}`}>
                  {isRejected ? "暂存" : scoreVerdict(score)}
                </span>
              </div>
              <div className="photo-score__number">
                <strong>{formatScore(photo.score)}</strong>
                <span>/ 5.0</span>
              </div>
              <div className="photo-score__meter">
                <span style={{ width: `${Math.min((score / 5) * 100, 100)}%` }} />
                <i style={{ left: "60%" }} />
              </div>
              <div className="photo-score__legend">
                <span>1.0</span>
                <span>公共档案 3.0</span>
                <span>5.0</span>
              </div>
            </div>

            <h1>{photo.title}</h1>
            <div className="photo-page__themes">
              <Link href={`/archive?view=theme&theme=${photo.theme}`} className="theme-chip">
                <span className="theme-chip__dot" style={{ background: theme.color }} />
                {theme.label}
                <small>{theme.latin}</small>
              </Link>
              {photo.tags.slice(0, 3).map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>

            <div className="photo-quote">
              <QuoteMark />
              <p>{photo.summary}</p>
            </div>

            <Link href={profileHref(photo.author.username)} className="photo-author">
              <span className="avatar">{initials(photo.author.name)}</span>
              <span className="photo-author__text">
                <strong>{photo.author.name}</strong>
                <small>
                  @{photo.author.username}
                  {photo.author.homeBase ? ` · ${photo.author.homeBase}` : ""}
                </small>
              </span>
              <ArrowUpRight />
            </Link>

            {!isRejected && !isPending && (
              <LikeButton
                photoId={photo.id}
                initialLiked={Boolean(photo.liked)}
                initialCount={photo.likeCount}
              />
            )}

            <div className="photo-meta">
              <div>
                <span>拍摄时间</span>
                <strong>{formatDate(photo.takenAt)}</strong>
              </div>
              <div>
                <span>地点</span>
                <strong>{photo.locationName ?? "未标注"}</strong>
              </div>
              <div>
                <span>器材</span>
                <strong>{photo.cameraModel ?? "未记录"}</strong>
              </div>
              <div>
                <span>镜头</span>
                <strong>{photo.lensModel ?? "未记录"}</strong>
              </div>
              {photo.aperture && (
                <div>
                  <span>光圈</span>
                  <strong>{photo.aperture}</strong>
                </div>
              )}
              {photo.shutterSpeed && (
                <div>
                  <span>快门</span>
                  <strong>{photo.shutterSpeed}</strong>
                </div>
              )}
              {photo.iso && (
                <div>
                  <span>ISO</span>
                  <strong>{photo.iso}</strong>
                </div>
              )}
              <div>
                <span>尺寸</span>
                <strong>{photo.width} × {photo.height}</strong>
              </div>
            </div>

            {isOwner && (
              <div className="photo-owner-actions">
                <span className="mono">THIS PHOTO / 这张照片</span>
                <DeletePhotoButton photoId={photo.id} label="删除这张照片" />
              </div>
            )}
          </div>
        </aside>
      </div>

      <section className="judgement shell">
        <div className="judgement__head">
          <span className="eyebrow">
            <span className="dot" />
            THE EDITOR&apos;S NOTE / 观看手记
          </span>
          <span className="judgement__source">
            {photo.aiProvider === "archive-editor" ? "编辑预置手记" : `${photo.aiProvider ?? "视觉模型"} · ${photo.aiModel ?? ""}`}
          </span>
        </div>
        <div className="judgement__grid">
          <div className="judgement__summary">
            <h2>
              {isRejected ? (
                <>
                  这次先不放进
                  <br />
                  <em>公共档案。</em>
                  <br />
                  但没有白走一趟。
                </>
              ) : (
                <>
                  这张照片，
                  <br />
                  为什么<em>打动了我们。</em>
                </>
              )}
            </h2>
            <div className="judgement__basis">
              <span className="mono">HOW WE LOOKED / 我们如何观看</span>
              <ol>
                {SCORE_RUBRIC.map((item) => (
                  <li key={item.index}>
                    <span>{item.index}</span>
                    {item.title}
                  </li>
                ))}
              </ol>
            </div>
            <p className="judgement__meta">
              {photo.aiProvider === "archive-editor"
                ? "这张照片的观看手记由档案编辑预置，作为示例内容保留在公开展示中。"
                : `这一份手记由 ${photo.aiProvider ?? "视觉模型"} · ${photo.aiModel ?? ""} 生成，并随照片一起长期保存。`}
            </p>
          </div>
          <div className="judgement__lists">
            <div className="judgement-list">
              <div className="judgement-list__head">
                <span>01</span>
                <h3>{isRejected ? "它依然好的地方" : "它打动人的地方"}</h3>
                <small>WHAT WORKS</small>
              </div>
              <ol>
                {photo.strengths.map((item, index) => (
                  <li key={item}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{item}</p>
                  </li>
                ))}
                {photo.strengths.length === 0 && <li><p>这一次，画面还没有把它的理由说清楚。</p></li>}
              </ol>
            </div>
            <div className="judgement-list judgement-list--next">
              <div className="judgement-list__head">
                <span>02</span>
                <h3>{isRejected ? "下一次，可以试试" : "下一次，可以更好"}</h3>
                <small>{isRejected ? "NEXT TIME" : "NEXT FRAME"}</small>
              </div>
              <ol>
                {photo.improvements.map((item, index) => (
                  <li key={item}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{item}</p>
                  </li>
                ))}
                {photo.improvements.length === 0 && <li><p>慢慢来，下一张会更好。</p></li>}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="photo-related shell">
        <div className="photo-related__head">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              CONTINUE WALKING / 继续走
            </p>
            <h2>同一片山野的其它照片</h2>
          </div>
          <Link href={`/archive?view=theme&theme=${photo.theme}`} className="text-link">
            查看全部 {theme.label}
            <ArrowUpRight />
          </Link>
        </div>
        <div className="photo-related__grid">
          {related.map((item, index) => (
            <PhotoCard key={item.id} photo={item} index={index} layout="grid" />
          ))}
        </div>
      </section>
    </article>
  );
}
