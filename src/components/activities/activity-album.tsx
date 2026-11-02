import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";
import { groupActivityPhotosByDay } from "@/lib/activities";
import { formatShortDate } from "@/lib/utils";
import type { PhotoDto } from "@/server/photos/dto";

export function ActivityAlbum({ photos, slug }: { photos: PhotoDto[]; slug: string }) {
  if (photos.length === 0) {
    return (
      <div className="activity-album-empty">
        <span className="activity-album-empty__mark">+</span>
        <h3>相册还空着。</h3>
        <p>把这次同行带回来的第一张照片放进来，其他人就能一起看了。</p>
        <Link href={`/studio/upload?activity=${encodeURIComponent(slug)}`} className="btn btn--ink">
          放进第一张
          <ArrowUpRight />
        </Link>
      </div>
    );
  }

  const groups = groupActivityPhotosByDay(photos);

  return (
    <div className="activity-album">
      {groups.map((group) => (
        <section className="activity-album__day" key={group.label}>
          <div className="activity-album__day-head">
            <span className="mono">{group.label}</span>
            <span>{group.photos.length} 张</span>
          </div>
          <div className="activity-album__grid">
            {group.photos.map((photo) => (
              <Link
                key={photo.id}
                href={`/photo/${photo.id}`}
                className="activity-photo"
                aria-label={`查看 ${photo.author.name} 的「${photo.title}」`}
              >
                <img
                  src={photo.thumbUrl}
                  alt={photo.title}
                  loading="lazy"
                  decoding="async"
                  width={photo.width}
                  height={photo.height}
                />
                {photo.visibility === "public" && (
                  <span className="activity-photo__public">已公开</span>
                )}
                <span className="activity-photo__meta">
                  <span>{photo.author.name}</span>
                  <span>{formatShortDate(photo.takenAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
