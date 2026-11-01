import Link from "next/link";
import { ContourField } from "@/components/contour-field";
import { ArrowDown, ArrowRight, ArrowUpRight, UploadIcon } from "@/components/icons";
import { PhotoGrid } from "@/components/photo-grid";
import { SectionHeading } from "@/components/section-heading";
import { PHOTO_THEMES, SCORE_RUBRIC, getTheme } from "@/lib/constants";
import { formatDate, formatScore } from "@/lib/utils";
import { describeProvider } from "@/server/ai/evaluator";
import { getCurrentUser } from "@/server/auth-session";
import {
  getFeaturedPhotos,
  getPublicStats,
  getThisWeekPhotos,
  listPublicPhotos,
} from "@/server/photos/queries";

export const metadata = {
  title: "把走过的山野，好好收起来",
  description:
    "为户外徒步者建立的影像档案馆。每一张照片都会被认真看见，并留下一份温柔、具体的中文手记。",
};

export default async function HomePage() {
  const user = await getCurrentUser();
  const [featured, thisWeek, fallback, stats] = await Promise.all([
    getFeaturedPhotos(8),
    getThisWeekPhotos(8),
    listPublicPhotos({ limit: 8 }),
    getPublicStats(),
  ]);

  const photos = thisWeek.length >= 6 ? thisWeek : fallback;
  const heroPhoto =
    featured.find((photo) => photo.theme === "company") ?? featured[0] ?? photos[0];
  const insetPhoto =
    featured.find((photo) => photo.theme === "night" && photo.id !== heroPhoto?.id) ??
    featured.find((photo) => photo.id !== heroPhoto?.id) ??
    photos[1];
  const smallPhoto =
    featured.find(
      (photo) => photo.theme === "water" && photo.id !== heroPhoto?.id && photo.id !== insetPhoto?.id,
    ) ??
    featured.find((photo) => photo.id !== heroPhoto?.id && photo.id !== insetPhoto?.id) ??
    photos[2];
  const quotePhoto = photos.find((photo) => photo.theme === "forest") ?? photos[4] ?? heroPhoto;
  const provider = describeProvider();
  const uploadHref = user ? "/studio/upload" : "/login?next=/studio/upload";

  if (!heroPhoto) {
    return (
      <section className="empty-home shell">
        <p className="eyebrow">GOHIKING.CLUB</p>
        <h1>山行档案，正在等第一张山野。</h1>
        <p>不急着拍得完美。先把那一次出发带回来，我们会认真看。</p>
        <Link href={uploadHref} className="btn btn--ink">
          放进第一张照片
          <ArrowUpRight />
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="hero">
        <ContourField className="hero__contours" />
        <div className="hero__grid shell">
          <div className="hero__copy">
            <p className="eyebrow hero__eyebrow">
              <span className="dot" />
              A GENTLE ARCHIVE FOR HIKERS · EST. 2026
            </p>
            <h1 className="hero__title">
              <span>把走过的</span>
              <span>
                <em>山野</em>，好好
              </span>
              <span>收起来。</span>
            </h1>
            <p className="hero__lede">
              山野不生产照片，它只把光、风和等待交给你。你带回的那一张，也许不完美，
              却有你走过的证据。我们愿意替你认真看一看，再好好收起来。
            </p>
            <div className="hero__actions">
              <Link href={uploadHref} className="btn btn--ink">
                <UploadIcon />
                放进一张照片
              </Link>
              <Link href="/archive" className="text-link">
                去看看山野档案
                <ArrowRight />
              </Link>
            </div>
            <dl className="hero__stats">
              <div>
                <dt>公共影像</dt>
                <dd>{stats.accepted || photos.length}</dd>
              </div>
              <div>
                <dt>同行摄影师</dt>
                <dd>{stats.photographers}</dd>
              </div>
              <div>
                <dt>平均手记分</dt>
                <dd>{stats.averageScore ? stats.averageScore.toFixed(1) : "—"}</dd>
              </div>
              <div>
                <dt>观看方式</dt>
                <dd className="hero__stat-word">每一张都被看见</dd>
              </div>
            </dl>
          </div>

          <div className="hero__visual">
            <div className="hero__stamp" aria-hidden>
              <span>放进</span>
              <strong>{formatScore(heroPhoto.score)}</strong>
              <span>/ 5</span>
              <i>FIELD SELECT</i>
            </div>

            <figure className="hero-photo hero-photo--main">
              <img
                src={heroPhoto.imageUrl}
                srcSet={`${heroPhoto.thumbUrl} 720w, ${heroPhoto.imageUrl} 2200w`}
                sizes="(max-width: 760px) 78vw, 40vw"
                alt={heroPhoto.title}
                fetchPriority="high"
              />
              <figcaption>
                <span>NO. {heroPhoto.id.slice(-3).toUpperCase()}</span>
                <span>{getTheme(heroPhoto.theme).latin}</span>
              </figcaption>
            </figure>

            {insetPhoto && (
              <figure className="hero-photo hero-photo--inset">
                <img
                  src={insetPhoto.imageUrl}
                  srcSet={`${insetPhoto.thumbUrl} 720w, ${insetPhoto.imageUrl} 2200w`}
                  sizes="(max-width: 760px) 48vw, 22vw"
                  alt={insetPhoto.title}
                  loading="lazy"
                />
                <figcaption>
                  <span>{insetPhoto.title}</span>
                  <span>{insetPhoto.locationName}</span>
                </figcaption>
              </figure>
            )}

            <div className="hero__caption">
              <div>
                <span className="hero__caption-label">THIS WEEK / 本周看见</span>
                <strong>{heroPhoto.title}</strong>
              </div>
              <div>
                <span>{heroPhoto.author.name}</span>
                <span>{formatDate(heroPhoto.takenAt)}</span>
              </div>
            </div>

            <div className="hero__side-label" aria-hidden>
              <span>FIELD NOTE 001</span>
              <span>{describeProvider().model}</span>
            </div>
          </div>
        </div>

        <div className="hero__foot shell">
          <a href="#this-week" className="hero__scroll">
            <span className="hero__scroll-icon">
              <ArrowDown />
            </span>
            向山下走，也向山里看
          </a>
          <p>
            {provider.label} · {provider.model}
            <span> / 3.0 分进入公共档案 / 暂存照片 24 小时后自动删除</span>
          </p>
        </div>
      </section>

      <div className="ticker" aria-hidden>
        <div className="ticker__track">
          {[0, 1].map((repeat) => (
            <div className="ticker__set" key={repeat}>
              <span>光影 LIGHT</span>
              <i />
              <span>构图 COMPOSITION</span>
              <i />
              <span>叙事 NARRATIVE</span>
              <i />
              <span>山野 WILD</span>
              <i />
              <span>被看见 SEEN</span>
              <i />
              <span>真诚 HONEST</span>
              <i />
            </div>
          ))}
        </div>
      </div>

      <section className="week-section shell" id="this-week">
        <SectionHeading
          index="01"
          kicker="THE RIDGE SELECTS / 本期山脊"
          title={
            <>
              这一周，
              <br className="only-mobile" />
              山野留下了什么
            </>
          }
          description="不是热度最高的照片，而是经过认真观看之后，仍然值得被记住的画面。"
          action={
            <Link href="/archive" className="text-link">
              查看全部 {stats.accepted} 张
              <ArrowUpRight />
            </Link>
          }
        />

        <div className="theme-rail">
          <span className="theme-rail__label">按主题进入</span>
          {PHOTO_THEMES.map((theme) => (
            <Link key={theme.id} href={`/archive?theme=${theme.id}`} className="theme-chip">
              <span className="theme-chip__dot" style={{ background: theme.color }} />
              {theme.label}
              <small>{theme.latin}</small>
            </Link>
          ))}
        </div>

        <PhotoGrid photos={photos.slice(0, 8)} layout="editorial" priorityCount={2} />
        <div className="week-section__foot">
          <p>
            <span className="mono">ARCHIVE NOTE</span>
            每张照片都保留完整的观看手记。分数不是终点，它只是一次更认真看见的开始。
          </p>
          <Link href="/archive" className="btn btn--outline">
            进入完整档案
            <ArrowUpRight />
          </Link>
        </div>
      </section>

      <section className="quote-section" style={{ backgroundColor: quotePhoto?.dominantColor ?? "#2b342b" }}>
        {quotePhoto && (
          <img
            src={quotePhoto.imageUrl}
            srcSet={`${quotePhoto.thumbUrl} 720w, ${quotePhoto.imageUrl} 2200w`}
            sizes="100vw"
            alt=""
            aria-hidden
            loading="lazy"
            className="quote-section__bg"
          />
        )}
        <div className="quote-section__veil" />
        <div className="quote-section__inner shell">
          <p className="eyebrow eyebrow--light">
            <span className="dot" />
            FIELD NOTE 02 / 关于留下
          </p>
          <blockquote>
            “山野不会替你按下快门。
            <br />
            它只是把光放在那里，
            <br />
            看你<em>有没有看见</em>。”
          </blockquote>
          <div className="quote-section__meta">
            <span>{quotePhoto?.title}</span>
            <span>{quotePhoto?.author.name} · {quotePhoto?.locationName}</span>
          </div>
        </div>
      </section>

      <section className="standard-section" id="standard">
        <div className="standard-section__inner shell">
          <div className="standard-section__intro">
            <SectionHeading
              index="02"
              kicker="THE WAY WE LOOK / 我们如何观看"
              title={
                <>
                  一张照片，
                  <br className="only-mobile" />
                  值得被认真看完。
                </>
              }
              description="我们请多模态视觉模型从光影、构图、山野叙事与独特观看四个维度阅读一张照片。5 分是满分，3 分是进入公共档案的邀请线，而不是对照片价值的判决。暂时没到 3 分的照片，也会收到具体、温柔的手记。"
              light
            />
            <div className="score-scale" aria-label="评分参考：3 分进入公共档案，5 分满分">
              <div className="score-scale__labels">
                <span>1.0</span>
                <span>3.0 公共档案</span>
                <span>5.0</span>
              </div>
              <div className="score-scale__bar">
                <span className="score-scale__reject" />
                <span className="score-scale__accept" />
                <i />
              </div>
              <div className="score-scale__notes">
                <span>还需要一点时间</span>
                <span>诚实的记录</span>
                <span>愿意再想起</span>
              </div>
            </div>
            <p className="standard-section__small">
              还没到 3 分的照片不会被公开，也不会被否定。我们会在 24 小时内保留它，
              供你读完手记，然后自动移除原图与预览。
            </p>
          </div>
          <div className="rubric-list">
            {SCORE_RUBRIC.map((item) => (
              <div className="rubric" key={item.index}>
                <span className="rubric__index">{item.index}</span>
                <div className="rubric__title">
                  <h3>{item.title}</h3>
                  <span>{item.latin}</span>
                </div>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="closing-section">
        <div className="closing-section__inner shell">
          <p className="eyebrow">
            <span className="dot" />
            OPEN CALL / 长期征稿
          </p>
          <h2>
            山一直在那里。
            <br />
            <em>你准备带上哪一张回来？</em>
          </h2>
          <div className="closing-section__actions">
            <Link href={uploadHref} className="btn btn--ink">
              <UploadIcon />
              放进一张照片
            </Link>
            <Link href="/register" className="text-link">
              成为档案成员
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
