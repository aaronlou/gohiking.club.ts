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
  compact = false,
}: {
  photo: PhotoDto;
  accepted: boolean;
  latencyMs: number;
  onAgain: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const score = photo.score ?? 0;
  const theme = getTheme(photo.theme);

  return (
    <div className={`result-panel ${accepted ? "is-accepted" : "is-rejected"} ${compact ? "result-panel--compact" : ""}`}>
      <div className="result-panel__media">
        <img src={photo.imageUrl} alt={photo.title} />
        <span className="result-panel__stamp">
          {accepted ? "入选" : "未入选"}
          <strong>{formatScore(photo.score)}</strong>
          <small>/ 5</small>
        </span>
      </div>

      <div className="result-panel__body">
        <div className="result-panel__top">
          <span className="eyebrow">
            <span className="dot" />
            {accepted ? "ACCEPTED INTO THE ARCHIVE / 已入选" : "NOT THIS TIME / 本次未入选"}
          </span>
          <span className="mono">
            {latencyMs > 0 ? `${(latencyMs / 1000).toFixed(1)}s · ${photo.aiModel ?? "视觉评审"}` : photo.aiModel ?? ""}
          </span>
        </div>

        <h2>
          {accepted ? (
            <>
              这张照片，
              <br />
              <em>值得留下。</em>
            </>
          ) : (
            <>
              这次没有入选，
              <br />
              <em>
                但我们告诉你
                <br />
                为什么。
              </em>
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
            <span>{accepted ? "达到 3.0 入选线" : "低于 3.0 入选线"}</span>
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
              <h3>{accepted ? "它成立的地方" : "仍然成立的地方"}</h3>
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
              <h3>{accepted ? "下一次，可以更好" : "为什么没有入选"}</h3>
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
              打开这张照片的档案
              <ArrowUpRight />
            </Link>
            <button type="button" className="btn btn--outline" onClick={onAgain}>
              再交一张
            </button>
            <span className="result-panel__saved">
              <CheckIcon />
              已保存为公开档案
            </span>
          </div>
        ) : (
          <>
            <div className="rejection-note">
              <div className="rejection-note__icon">24h</div>
              <div>
                <strong>这张照片不会长期保存。</strong>
                <p>
                  你可以在这段时间里查看完整的评审意见。{countdownLabel(photo.expiresAt)}之后，
                  原图与预览会被自动删除。
                </p>
              </div>
            </div>
            <div className="result-panel__actions">
              <button type="button" className="btn btn--ink" onClick={onAgain}>
                重新挑一张
              </button>
              <DeletePhotoButton photoId={photo.id} label="现在清理" redirectTo="/studio" />
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
