"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DeletePhotoButton } from "@/components/delete-photo-button";
import { ArrowUpRight } from "@/components/icons";
import { getTheme } from "@/lib/constants";
import { formatScore, formatShortDate } from "@/lib/utils";
import type { PhotoDto } from "@/server/photos/dto";
import { RetryEvaluationButton } from "./retry-evaluation-button";

type Filter = "all" | "activity" | "standalone" | "public" | "quarantine";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "activity", label: "活动" },
  { id: "standalone", label: "单独" },
  { id: "public", label: "已公开" },
  { id: "quarantine", label: "待处理" },
];

function countsFor(photos: PhotoDto[]) {
  return {
    all: photos.length,
    activity: photos.filter((photo) => photo.activityId).length,
    standalone: photos.filter((photo) => !photo.activityId).length,
    public: photos.filter(
      (photo) => photo.status === "accepted" && photo.visibility === "public",
    ).length,
    quarantine: photos.filter(
      (photo) =>
        photo.status === "failed" ||
        (photo.status === "rejected" && !photo.activityId),
    ).length,
  };
}

export function StudioArchive({ photos }: { photos: PhotoDto[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const counts = useMemo(() => countsFor(photos), [photos]);

  const filtered = useMemo(() => {
    if (filter === "all") return photos;
    if (filter === "activity") return photos.filter((photo) => photo.activityId);
    if (filter === "standalone") return photos.filter((photo) => !photo.activityId);
    if (filter === "public") {
      return photos.filter(
        (photo) => photo.status === "accepted" && photo.visibility === "public",
      );
    }
    return photos.filter(
      (photo) =>
        photo.status === "failed" ||
        (photo.status === "rejected" && !photo.activityId),
    );
  }, [filter, photos]);

  const emptyCopy =
    filter === "activity"
      ? "还没有照片放进活动。从活动页点「放进一张照片」就会收在这里。"
      : filter === "standalone"
        ? "还没有单独上传的照片。所有不属于活动的照片都会留在这里。"
        : filter === "public"
          ? "还没有公开的照片。想公开时，在照片页由你自己决定。"
          : filter === "quarantine"
            ? "暂时没有需要处理的照片。"
            : "把第一段山野带回来，交给一次认真的观看。";

  return (
    <div className="studio-archive">
      <div className="studio-archive__toolbar">
        <div className="studio-archive__filters" role="tablist" aria-label="照片筛选">
          {filters.map((item) => (
            <button
              type="button"
              key={item.id}
              role="tab"
              aria-selected={filter === item.id}
              className={filter === item.id ? "is-active" : ""}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              <span>{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <span className="mono">CROSS-TRIP ARCHIVE</span>
      </div>

      {filtered.length === 0 ? (
        <div className="studio-empty">
          <span className="studio-empty__mark">＋</span>
          <h3>这里还没有照片。</h3>
          <p>{emptyCopy}</p>
          {filter === "all" && (
            <Link href="/studio/upload" className="btn btn--ink">
              放进第一张照片
              <ArrowUpRight />
            </Link>
          )}
        </div>
      ) : (
        <div className="studio-archive__list">
          {filtered.map((photo) => {
            const isRejected = photo.status === "rejected";
            const isPending = photo.status === "evaluating" || photo.status === "failed";
            const isUnrated = photo.status === "unrated";
            const inActivity = Boolean(photo.activityId);
            const theme = getTheme(photo.theme);
            return (
              <article className={`studio-photo status-${photo.status}`} key={photo.id}>
                <Link href={`/photo/${photo.id}`} className="studio-photo__image">
                  <img src={photo.thumbUrl} alt={photo.title} loading="lazy" />
                  <span className="studio-photo__status">
                    {photo.status === "accepted"
                      ? photo.visibility === "public"
                        ? "已收录"
                        : "活动内"
                      : isUnrated
                        ? "活动内"
                        : photo.status === "rejected"
                          ? inActivity
                            ? "未公开"
                            : "未收录"
                          : photo.status === "failed"
                            ? "观看中断"
                            : "观看中"}
                  </span>

                </Link>
                <div className="studio-photo__info">
                  <div className="studio-photo__meta">
                    <span className="mono">
                      {theme.label} / {theme.latin}
                    </span>
                    <span className="mono">{formatShortDate(photo.takenAt)}</span>
                  </div>

                  {photo.activity ? (
                    <span className="studio-photo__activity" title={photo.activity.title}>
                      活动 · {photo.activity.title}
                    </span>
                  ) : (
                    <span className="studio-photo__activity is-standalone">单独上传</span>
                  )}

                  <h3>
                    <Link href={`/photo/${photo.id}`}>{photo.title}</Link>
                  </h3>
                  <p>
                    {photo.status === "accepted"
                      ? photo.summary?.slice(0, 62)
                      : isUnrated
                        ? "已经放进活动相册，还没有请山野观看。"
                        : photo.status === "rejected"
                          ? inActivity
                            ? "这张照片还在活动相册里，只有同行者能看到。"
                            : "看看这次的手记，或提前删除。"
                          : inActivity
                            ? "已经放进活动相册，还没有请山野观看。"
                            : "我们还在看这张照片。"}
                  </p>
                  <div className="studio-photo__actions">
                    {photo.status === "accepted" && (
                      <>
                        <span className="studio-score">
                          <strong>{formatScore(photo.score)}</strong> / 5
                        </span>
                        <Link href={`/photo/${photo.id}`} className="studio-action">
                          查看档案
                          <ArrowUpRight />
                        </Link>
                      </>
                    )}
                    {photo.status === "rejected" && (
                      <>
                        <span className="studio-score studio-score--low">
                          <strong>{formatScore(photo.score)}</strong> / 5
                        </span>
                        <DeletePhotoButton
                          photoId={photo.id}
                          label="提前删除"
                          className="studio-action studio-action--danger"
                        />
                      </>
                    )}
                    {isUnrated && (
                      <Link href={`/photo/${photo.id}`} className="studio-action">
                        查看档案
                        <ArrowUpRight />
                      </Link>
                    )}
                    {isPending && (
                      <RetryEvaluationButton
                        photoId={photo.id}
                        label={photo.status === "failed" ? "再看一次" : "继续观看"}
                      />
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
