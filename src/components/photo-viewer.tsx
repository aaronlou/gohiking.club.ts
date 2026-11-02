"use client";

import { useEffect, useRef, useState } from "react";
import type { PhotoDto } from "@/server/photos/dto";
import { ArrowUpRight, CloseIcon } from "@/components/icons";

type PhotoViewerProps = {
  photo: Pick<
    PhotoDto,
    "title" | "previewUrl" | "fullUrl" | "thumbUrl" | "dominantColor" | "width" | "height"
  >;
  themeLabel: string;
  themeLatin: string;
  dateLabel: string;
};

export function PhotoViewer({ photo, themeLabel, themeLatin, dateLabel }: PhotoViewerProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setLoaded(false);
    setFailed(false);
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const hasSeparatePreview = photo.previewUrl !== photo.thumbUrl;

  return (
    <>
      <figure
        className="photo-detail-frame"
        style={{ backgroundColor: photo.dominantColor ?? undefined }}
      >
        <img
          src={photo.previewUrl}
          srcSet={
            hasSeparatePreview
              ? `${photo.thumbUrl} 720w, ${photo.previewUrl} 1280w`
              : undefined
          }
          sizes="(max-width: 900px) 100vw, 62vw"
          alt={photo.title}
          fetchPriority="high"
          decoding="async"
          width={photo.width}
          height={photo.height}
        />
        <figcaption>
          <span>
            {themeLabel} / {themeLatin}
          </span>
          <span>{dateLabel}</span>
        </figcaption>
      </figure>

      <div className="photo-view-tools">
        <span>轻量预览 · 原图只在你点开时加载</span>
        <a
          href={photo.fullUrl}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            setOpen(true);
          }}
        >
          查看原图
          <ArrowUpRight />
        </a>
      </div>

      {open && (
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${photo.title}的原图`}
          onClick={() => setOpen(false)}
        >
          <div className="photo-lightbox__bar">
            <div>
              <span className="mono">ORIGINAL / 原图</span>
              <strong>
                {photo.width} × {photo.height}
              </strong>
            </div>
            <div className="photo-lightbox__actions">
              <a href={photo.fullUrl} target="_blank" rel="noreferrer noopener">
                新标签页打开
                <ArrowUpRight />
              </a>
              <button
                ref={closeRef}
                type="button"
                aria-label="关闭原图"
                onClick={() => setOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className="photo-lightbox__stage" onClick={(event) => event.stopPropagation()}>
            {!loaded && !failed && <span className="photo-lightbox__loading">正在打开原图…</span>}
            {failed && <span className="photo-lightbox__loading">原图暂时没有打开，请稍后再试。</span>}
            <img
              src={photo.fullUrl}
              alt={photo.title}
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              style={{ visibility: loaded ? "visible" : "hidden" }}
            />
          </div>
          <p className="photo-lightbox__hint">点击背景或按 Esc 关闭 · 只在你需要时加载原始尺寸</p>
        </div>
      )}
    </>
  );
}
