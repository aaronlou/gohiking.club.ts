import Link from "next/link";
import { ArrowUpRight, HeartIcon } from "@/components/icons";
import { LikeButton } from "@/components/like-button";
import { groupActivityPhotosByDay } from "@/lib/activities";
import { formatShortDate } from "@/lib/utils";
import type { PhotoDto } from "@/server/photos/dto";

export function ActivityAlbum({
  photos,
  slug,
  viewerId,
  isMember,
}: {
  photos: PhotoDto[];
  slug: string;
  viewerId: string | null;
  isMember: boolean;
}) {
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
              <div className="activity-photo" key={photo.id}>
                <Link
                  href={`/photo/${photo.id}`}
                  className="activity-photo__link"
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
                {isMember && photo.author.id !== viewerId ? (
                  <LikeButton
                    photoId={photo.id}
                    initialLiked={Boolean(photo.liked)}
                    initialCount={photo.likeCount}
                    compact
                  />
                ) : photo.likeCount > 0 ? (
                  <span className="activity-photo__likes">
                    <HeartIcon filled={Boolean(photo.liked)} />
                    {photo.likeCount}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
