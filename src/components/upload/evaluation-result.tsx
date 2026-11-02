"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CheckIcon, QuoteMark } from "@/components/icons";
import { getTheme } from "@/lib/constants";
import { formatScore } from "@/lib/utils";
import type { PhotoDto } from "@/server/photos/dto";

const FALLBACK_TIPS = [
  "换一个时间：日出后或日落前一小时，光会更轻，颜色也更有层次。",
  "给画面找一个明确的主体，再决定把它放在哪里，别让山和天空各占一半。",
  "留一点前景——石阶、草叶或同行的人，让看照片的人有走进画面的路。",
];

export function EvaluationResult({
  photo,
  accepted,
  latencyMs,
  onAgain,
  activity = null,
}: {
  photo: PhotoDto;
  accepted: boolean;
  latencyMs: number;
  onAgain: () => void;
  activity?: { title: string } | null;
}) {
  const router = useRouter();
  const score = photo.score ?? 0;
  const theme = getTheme(photo.theme);
  const tips = photo.improvements.length > 0 ? photo.improvements : FALLBACK_TIPS;

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
          {accepted ? "放进" : "未收录"}
          <strong>{formatScore(photo.score)}</strong>
          <small>/ 5</small>
        </span>
      </div>

      <div className="result-panel__body">
        <div className="result-panel__top">
          <span className="eyebrow">
            <span className="dot" />
            {accepted
              ? activity
                ? "A PLACE IN THE FIELD ROLL / 已放进活动相册"
                : "A PLACE IN THE ARCHIVE / 已放进公共档案"
              : "A LITTLE MORE LIGHT / 这次还差一点"}
          </span>
          <span className="mono">
            {latencyMs > 0
              ? `${(latencyMs / 1000).toFixed(1)}s · ${photo.aiModel ?? "视觉手记"}`
              : photo.aiModel ?? ""}
          </span>
        </div>

        <h2>
          {accepted ? (
            activity ? (
              <>
                这张照片，
                <br />
                <em>已经放进这次同行。</em>
              </>
            ) : (
              <>
                这张照片，
                <br />
                <em>我们想替你留下。</em>
              </>
            )
          ) : activity ? (
            <>
              这次没有入选，
              <br />
              <em>但这一趟没有白拍。</em>
            </>
          ) : (
            <>
              这次没有进入
              <br />
              <em>公共档案，</em>
              <br />
              但这一趟没有白拍。
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
              {!accepted && photo.strengths.length === 0 && (
                <li>
                  <span>01</span>
                  <p>你愿意为这一趟举起相机，这件事本身就已经很好。</p>
                </li>
              )}
            </ol>
          </div>
          <div className="result-reasons__next">
            <div className="result-reasons__head">
              <span>02</span>
              <h3>{accepted ? "下一次，可以更好" : "下一次，可以试试"}</h3>
            </div>
            <ol>
              {tips.map((item, index) => (
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
              {activity ? "只对同行者可见" : "已与大家见面"}
            </span>
          </div>
        ) : (
          <>
            <div className="rejection-note">
              <div className="rejection-note__icon">↗</div>
              <div>
                <strong>这次的照片不会被保存。</strong>
                <p>
                  它不会出现在你的档案或公共档案里，你也不用删除什么。
                  唯一留下来的，是下面这几条给下一次的建议。
                </p>
              </div>
            </div>

            <div className="result-encouragement">
              <p>
                山野不急着一次拍好。带着这些建议，再去拍一张；
                你愿意带回来的每一张，都已经比昨天多走了一段路。
              </p>
              <span>— 给下一次按下快门的你</span>
            </div>

            <div className="result-panel__actions">
              <button type="button" className="btn btn--ink" onClick={onAgain}>
                再拍一张
              </button>
              <Link href="/archive" className="btn btn--outline">
                去看看公共档案
                <ArrowUpRight />
              </Link>
              <Link href="/" className="text-link">
                回到山口
                <ArrowUpRight />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
