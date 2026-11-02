import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublishPhotoButton } from "@/components/activities/publish-photo-button";
import { DeletePhotoButton } from "@/components/delete-photo-button";
import { ArrowUpRight, HeartIcon, LockIcon, QuoteMark } from "@/components/icons";
import { LikeButton } from "@/components/like-button";
import { PhotoCard } from "@/components/photo-card";
import { PhotoViewer } from "@/components/photo-viewer";
import { relatedPhotos } from "@/lib/archive";
import { SCORE_RUBRIC, getTheme } from "@/lib/constants";
import {
  formatDate,
  formatScore,
  initials,
  profileHref,
  scoreVerdict,
} from "@/lib/utils";
import { getMembership, isApprovedMembership } from "@/server/activities/access";
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
  if (!photo) return { title: "公共档案" };
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
  const membership =
    photo.activityId && viewer
      ? await getMembership(photo.activityId, viewer.id)
      : null;
  const isActivityMember = isApprovedMembership(membership);
  const canLike = Boolean(
    photo.activityId &&
      photo.status === "accepted" &&
      isActivityMember &&
      !isOwner,
  );
  const isRejected = photo.status === "rejected";
  const isPending = photo.status === "evaluating" || photo.status === "failed";
  const isPrivate = photo.visibility === "private";
  const isPublic = photo.status === "accepted" && photo.visibility === "public";
  const isActivityOnly = photo.visibility === "activity";
  const hasNote = photo.score !== null;
  const canSeeNote = (isPublic || isOwner) && hasNote;
  const score = photo.score ?? 0;
  const activityLinkable = Boolean(
    photo.activity && photo.activity.visibility !== "private",
  );

  return (
    <article className="photo-page">
      {isRejected && (
        <div className="quarantine-banner quarantine-banner--rejected">
          <div className="shell quarantine-banner__inner">
            <div>
              <span className="quarantine-banner__label">
                {photo.activityId
                  ? "A LITTLE MORE LIGHT / 这次还差一点"
                  : "NOT THIS TIME / 这次没有收录"}
              </span>
              <p>
                {photo.activityId
                  ? `这张照片没有通过公共档案的邀请线，但它仍然留在《${photo.activity?.title ?? "这次活动"}》的相册里，只有同行者能看到。手记和建议已经留在这里。`
                  : "这张照片没有进入公共档案，也不会被保存。你没有做错什么，只是这一次还没有走到邀请线上。"}
              </p>
            </div>
            {photo.activityId && activityLinkable && photo.activity && (
              <div className="quarantine-banner__actions">
                <Link href={`/activities/${photo.activity.slug}`} className="btn btn--outline">
                  回到活动
                  <ArrowUpRight />
                </Link>
              </div>
            )}
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
        <Link href="/archive">公共档案</Link>
        <span>/</span>
        <span>{theme.label}</span>
        <span>/</span>
        <span>{photo.title}</span>
        {isPrivate && (
          <span className="private-mark">
            <LockIcon /> 仅自己可见
          </span>
        )}
        {isActivityOnly && photo.activity && (
          activityLinkable ? (
            <Link
              href={`/activities/${photo.activity.slug}`}
              className="private-mark private-mark--activity"
            >
              <LockIcon /> 仅活动同行可见
            </Link>
          ) : (
            <span className="private-mark private-mark--activity">
              <LockIcon /> 仅活动同行可见
            </span>
          )
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
            {photo.activity &&
              (activityLinkable ? (
                <Link href={`/activities/${photo.activity.slug}`} className="photo-activity-link">
                  来自活动《{photo.activity.title}》
                  <ArrowUpRight />
                </Link>
              ) : (
                <span className="photo-activity-link">
                  来自活动《{photo.activity.title}》
                </span>
              ))}
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
            {canSeeNote && (
            <div className="photo-score">
              <div className="photo-score__top">
                <span className="eyebrow">
                  <span className="dot" />
                  WATCH NOTE / 观看分
                </span>
                <span className={`score-state ${isRejected ? "is-rejected" : ""}`}>
                  {isRejected ? "未进公共档案" : scoreVerdict(score)}
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
            )}

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

            {!canSeeNote && (
              <div className="photo-activity-note">
                <span className="mono">SHARED IN A FIELD ROLL</span>
                <p>
                  {isOwner
                    ? "这张照片还没有请山野看过。想公开到公共档案时，再点下面的按钮；在那之前，它只留在这次活动里。"
                    : "这张照片来自一次同行。观看手记与分数只对拍摄者本人可见；想公开到公共档案，也由拍摄者自己决定。"}
                </p>
              </div>
            )}

            {canSeeNote && (
              <div className="photo-quote">
                <QuoteMark />
                <p>{photo.summary}</p>
              </div>
            )}

            {isOwner && photo.activityId && (
              <PublishPhotoButton
                photoId={photo.id}
                published={photo.visibility === "public"}
              />
            )}

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

            {canLike ? (
              <LikeButton
                photoId={photo.id}
                initialLiked={Boolean(photo.liked)}
                initialCount={photo.likeCount}
              />
            ) : photo.activityId && photo.status === "accepted" ? (
              <div className="like-note">
                <HeartIcon filled={Boolean(photo.liked)} />
                <div>
                  <strong>{photo.likeCount} 次敬意</strong>
                  <span>
                    {isOwner
                      ? "同行者可以给这张照片留下敬意。"
                      : viewer
                        ? "只有这次活动的同行者，才能留下敬意。"
                        : "登录并加入这次活动后，才能留下敬意。"}
                  </span>
                </div>
              </div>
            ) : null}

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

      {canSeeNote && (
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
                  这次没有进入
                  <br />
                  <em>公共档案。</em>
                  <br />
                  但这一趟没有白拍。
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
      )}

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
