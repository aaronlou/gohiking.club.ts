import Link from "next/link";
import type { PhotoDto } from "@/server/photos/dto";
import { getTheme } from "@/lib/constants";
import { formatScore, formatShortDate, padIndex, profileHref } from "@/lib/utils";
import { ArrowUpRight } from "./icons";

type PhotoCardProps = {
  photo: PhotoDto;
  index: number;
  layout?: "editorial" | "grid" | "minimal";
  priority?: boolean;
};

export function PhotoCard({ photo, index, layout = "grid", priority = false }: PhotoCardProps) {
  const theme = getTheme(photo.theme);
  const score = formatScore(photo.score);

  return (
    <article className={`photo-card photo-card--${layout} photo-card--i${(index % 8) + 1}`}>
      <Link
        href={`/photo/${photo.id}`}
        className="photo-card__frame"
        aria-label={`查看「${photo.title}」`}
        style={{ backgroundColor: photo.dominantColor ?? "#c9c4b7" }}
      >
          <img
            src={photo.thumbUrl}
            alt={photo.title}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            width={photo.width}
            height={photo.height}
          />
          <div className="photo-card__grade" />
          <div className="photo-card__topline">
            <span className="photo-card__index">{padIndex(index + 1)}</span>
            <span className="photo-card__theme">
              {theme.label} / {theme.latin}
            </span>
          </div>
          <div className="photo-card__score">
            <span>{score}</span>
            <small>/ 5</small>
          </div>
        <div className="photo-card__hover">
          <span>OPEN FILE</span>
          <span className="photo-card__hover-icon">
            <ArrowUpRight />
          </span>
        </div>
      </Link>
      <div className="photo-card__meta">
        <div>
          <h3>
            <Link href={`/photo/${photo.id}`}>{photo.title}</Link>
          </h3>
          <p className="photo-card__credit">
            <Link href={profileHref(photo.author.username)} className="photo-card__author">
              {photo.author.name}
            </Link>
            <span aria-hidden>·</span>
            <span>{photo.locationName ?? "山野未标注"}</span>
          </p>
        </div>
        <div className="photo-card__date">
          <span>{formatShortDate(photo.takenAt)}</span>
          <span className="photo-card__likes">{photo.likeCount} 敬意</span>
        </div>
      </div>
    </article>
  );
}

export function PhotoCardSimple({ photo, index }: { photo: PhotoDto; index: number }) {
  return (
    <Link href={`/photo/${photo.id}`} className="photo-mini">
      <img src={photo.thumbUrl} alt={photo.title} loading="lazy" />
      <span className="photo-mini__score">{formatScore(photo.score)}</span>
    </Link>
  );
}
