import Link from "next/link";
import type { PhotoDto } from "@/server/photos/dto";
import { getTheme } from "@/lib/constants";
import { formatScore } from "@/lib/utils";
import { ArrowUpRight } from "@/components/icons";
import { ContourMark as Mark } from "@/components/logo";

export function AuthFrame({
  eyebrow,
  title,
  note,
  image,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  note: string;
  image: PhotoDto | null;
  children: React.ReactNode;
}) {
  return (
    <section className="auth-page">
      <div className="auth-visual">
        {image ? (
          <img src={image.imageUrl} alt={image.title} className="auth-visual__image" />
        ) : (
          <div className="auth-visual__fallback" />
        )}
        <div className="auth-visual__veil" />
        <div className="auth-visual__top">
          <Link href="/" className="auth-brand" aria-label="回到山行档案">
            <Mark />
            <span>山行档案</span>
          </Link>
          <span className="mono">MEMBER ACCESS / 成员入口</span>
        </div>
        {image && (
          <>
            <div className="auth-visual__caption">
              <span>{getTheme(image.theme).latin}</span>
              <strong>{image.title}</strong>
              <span>
                {image.author.name} · {image.locationName}
              </span>
            </div>
            <div className="auth-visual__score">
              <span>SCORE</span>
              <strong>{formatScore(image.score)}</strong>
              <span>/ 5</span>
            </div>
          </>
        )}
        <p className="auth-visual__quote">
          山野不会替你按下快门。
          <br />
          但总有人，愿意为一次观看
          <br />
          <em>多走一段路。</em>
        </p>
        <div className="auth-visual__bottom">
          <span>GOHIKING.CLUB</span>
          <span>FIELD ARCHIVE · EST. 2026</span>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-panel__inner">
          <div className="auth-panel__top">
            <p className="eyebrow">
              <span className="dot" />
              {eyebrow}
            </p>
            <Link href="/" className="auth-back">
              返回山野
              <ArrowUpRight />
            </Link>
          </div>
          <h1>{title}</h1>
          <p className="auth-note">{note}</p>
          {children}
          <div className="auth-panel__footer">
            <span>山行档案 · 为户外徒步者建立的影像档案馆</span>
            <span>成都 / 温哥华 / 山野</span>
          </div>
        </div>
        <div className="auth-panel__stamp" aria-hidden>
          <Mark />
          <span>TAKE THE LONG WAY HOME</span>
        </div>
      </div>
    </section>
  );
}
