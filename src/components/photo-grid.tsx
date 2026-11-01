import type { PhotoDto } from "@/server/photos/dto";
import { cn } from "@/lib/utils";
import { PhotoCard } from "./photo-card";

export function PhotoGrid({
  photos,
  layout = "editorial",
  className,
  startIndex = 0,
  priorityCount = 0,
}: {
  photos: PhotoDto[];
  layout?: "editorial" | "grid";
  className?: string;
  startIndex?: number;
  priorityCount?: number;
}) {
  return (
    <div className={cn("photo-grid", `photo-grid--${layout}`, className)}>
      {photos.map((photo, index) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          index={startIndex + index}
          layout={layout === "editorial" ? "editorial" : "grid"}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}
