"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeletePhotoButton } from "@/components/delete-photo-button";
import { ArrowUpRight, CheckIcon, QuoteMark } from "@/components/icons";
import { getTheme } from "@/lib/constants";
import { countdownLabel, formatScore } from "@/lib/utils";
import type { PhotoDto } from "@/server/photos/dto";

export function EvaluationResult({
  photo,
  accepted,
  latencyMs,
  onAgain,
}: {
  photo: PhotoDto;
  accepted: boolean;
  latencyMs: number;
  onAgain: () => void;
}) {
  const router = useRouter();
  const score = photo.score ?? 0;
  const theme = getTheme(photo.theme);

  return (
    <div className={`result-panel ${accepted ? "is-accepted" : "is-rejected"}`}>
      <div className="result-panel__media">
        <img
          src={photo.previewUrl}
          srcSet={
            photo.previewUrl !== photo.thumbUrl
              ? `${photo.thumbUrl} 720w, ${photo.previewUrl} 1280w`
              : undefined
          }
          sizes="(max-width: 760px) 92vw, 42vw"
          alt={photo.title}
        />
        <span className="result-panel__stamp">
          {accepted ? "放进" : "暂存"}
          <strong>{formatScore(photo.score)}</strong>
          <small>/ 5</small>
        </span>
      </div>

      <div className="result-panel__body">
        <div className="result-panel__top">
          <span className="eyebrow">
            <span className="dot" />
            {accepted ? "A PLACE IN THE ARCHIVE / 已放进公共档案" : "A LITTLE MORE TIME / 这次先留给你"}
          </span>
          <span className="mono">
            {latencyMs > 0 ? `${(latencyMs / 1000).toFixed(1)}s · ${photo.aiModel ?? "视觉手记"}` : photo.aiModel ?? ""}
          </span>
        </div>

        <h2>
          {accepted ? (
            <>
              这张照片，
              <br />
              <em>我们想替你留下。</em>
            </>
          ) : (
            <>
              这次先不放进
              <br />
              <em>公共档案，</em>
              <br />
              但它没有被否定。
            </>
          )}
        </h2>

        <div className="result-panel__score">
          <div className="result-panel__score-number">
            <strong>{formatScore(photo.score)}</strong>
            <span>/ 5.0</span>
          </div>
          <div className="result-panel__score-bar">
            <span style={{ width: `${(score / 5) * 100}%` }} />
            <i style={{ left: "60%" }} />
          </div>
          <div className="result-panel__score-state">
            <span>{accepted ? "达到了 3.0 的邀请线" : "离 3.0 的邀请线还差一点"}</span>
            <Link href={`/archive?view=theme&theme=${photo.theme}`}>
              {theme.label} · {theme.latin}
              <ArrowUpRight />
            </Link>
          </div>
        </div>

        <div className="result-quote">
          <QuoteMark />
          <p>{photo.summary}</p>
        </div>

        <div className="result-reasons">
          <div>
            <div className="result-reasons__head">
              <span>01</span>
              <h3>{accepted ? "它打动人的地方" : "它依然好的地方"}</h3>
            </div>
            <ol>
              {photo.strengths.map((item, index) => (
                <li key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="result-reasons__next">
            <div className="result-reasons__head">
              <span>02</span>
              <h3>{accepted ? "下一次，可以更好" : "下一次，可以试试"}</h3>
            </div>
            <ol>
              {photo.improvements.map((item, index) => (
                <li key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {accepted ? (
          <div className="result-panel__actions">
            <Link href={`/photo/${photo.id}`} className="btn btn--ink" onClick={() => router.refresh()}>
              查看照片
              <ArrowUpRight />
            </Link>
            <button type="button" className="btn btn--outline" onClick={onAgain}>
              再放一张
            </button>
            <span className="result-panel__saved">
              <CheckIcon />
              已与大家见面
            </span>
          </div>
        ) : (
          <>
            <div className="rejection-note">
              <div className="rejection-note__icon">24h</div>
              <div>
                <strong>这张照片，会先留在你身边。</strong>
                <p>
                  你可以慢慢读完这份手记。{countdownLabel(photo.expiresAt)}，
                  我们会自动移除原图与预览；你也可以随时提前删除。
                </p>
              </div>
            </div>
            <div className="result-panel__actions">
              <button type="button" className="btn btn--ink" onClick={onAgain}>
                换一张试试
              </button>
              <DeletePhotoButton photoId={photo.id} label="提前删除" redirectTo="/studio" />
              <Link href="/studio" className="text-link">
                回到工作室
                <ArrowUpRight />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
