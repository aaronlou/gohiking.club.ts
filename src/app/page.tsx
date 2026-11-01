import Link from "next/link";
import { CameraIllustration } from "@/components/camera/camera-illustration";
import { ContourField } from "@/components/contour-field";
import { ArrowDown, ArrowRight, ArrowUpRight, CameraIcon, UploadIcon } from "@/components/icons";
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
  title: "只留下值得背下山的照片",
  description:
    "为户外徒步者建立的影像档案馆。多模态 AI 认真观看每一张照片，只留下 3 分以上的山野影像，并按主题、时间与摄影师归档。",
};

const homeCamera = {
  name: "山脊 35",
  bodyColor: "moss",
  accentColor: "#e96b40",
  lens: "field-35",
  filmStock: "pine-400",
  strap: "canvas",
  engraving: "FIELD NOTES · 2026",
  serial: "GH·26·FIELD",
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
        <h1>山行档案正在等待第一张照片。</h1>
        <Link href={uploadHref} className="btn btn--ink">
          成为第一位提交者
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
              A FIELD ARCHIVE FOR HIKERS · EST. 2026
            </p>
            <h1 className="hero__title">
              <span>只留下</span>
              <span>
                <em>值得背下山</em>
              </span>
              <span>的照片。</span>
            </h1>
            <p className="hero__lede">
              山野不生产照片，它只提供光线、风和等待。我们为徒步者保管那些真正发生的瞬间——
              先经过一次认真的观看，再被放进档案。
            </p>
            <div className="hero__actions">
              <Link href={uploadHref} className="btn btn--ink">
                <UploadIcon />
                提交一张照片
              </Link>
              <Link href="/archive" className="text-link">
                浏览完整影像档案
                <ArrowRight />
              </Link>
            </div>
            <dl className="hero__stats">
              <div>
                <dt>入选影像</dt>
                <dd>{stats.accepted || photos.length}</dd>
              </div>
              <div>
                <dt>徒步摄影师</dt>
                <dd>{stats.photographers}</dd>
              </div>
              <div>
                <dt>平均评分</dt>
                <dd>{stats.averageScore ? stats.averageScore.toFixed(1) : "—"}</dd>
              </div>
              <div>
                <dt>视觉评审</dt>
                <dd className="hero__stat-word">每张都有理由</dd>
              </div>
            </dl>
          </div>

          <div className="hero__visual">
            <div className="hero__stamp" aria-hidden>
              <span>入选</span>
              <strong>{formatScore(heroPhoto.score)}</strong>
              <span>/ 5</span>
              <i>FIELD SELECT</i>
            </div>

            <figure className="hero-photo hero-photo--main">
              <img src={heroPhoto.imageUrl} alt={heroPhoto.title} fetchPriority="high" />
              <figcaption>
                <span>NO. {heroPhoto.id.slice(-3).toUpperCase()}</span>
                <span>{getTheme(heroPhoto.theme).latin}</span>
              </figcaption>
            </figure>

            {insetPhoto && (
              <figure className="hero-photo hero-photo--inset">
                <img src={insetPhoto.imageUrl} alt={insetPhoto.title} />
                <figcaption>
                  <span>{insetPhoto.title}</span>
                  <span>{insetPhoto.locationName}</span>
                </figcaption>
              </figure>
            )}

            <div className="hero__caption">
              <div>
                <span className="hero__caption-label">CURRENT SELECT</span>
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
            <span> / 3.0 分入选线 / 低分照片 24 小时后清理</span>
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
              <span>真实 REAL</span>
              <i />
              <span>克制 RESTRAINT</span>
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
            每张照片都保留完整的评审手记。分数不是终点，它只是一次更认真观看的开始。
          </p>
          <Link href="/archive" className="btn btn--outline">
            进入完整档案
            <ArrowUpRight />
          </Link>
        </div>
      </section>

      <section className="quote-section" style={{ backgroundColor: quotePhoto?.dominantColor ?? "#2b342b" }}>
        {quotePhoto && <img src={quotePhoto.imageUrl} alt="" aria-hidden className="quote-section__bg" />}
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
              kicker="THE STANDARD / 评审标准"
              title={
                <>
                  不是所有照片，
                  <br className="only-mobile" />
                  都值得一直占着位置。
                </>
              }
              description="我们使用多模态视觉模型，从四个维度观看一张照片。满分 5 分，3 分是档案的入选线。低于 3 分不是羞辱，而是一次关于「下一步怎么拍」的诚实反馈。"
              light
            />
            <div className="score-scale" aria-label="评分标准：3 分入选，5 分满分">
              <div className="score-scale__labels">
                <span>1.0</span>
                <span>3.0 入选线</span>
                <span>5.0</span>
              </div>
              <div className="score-scale__bar">
                <span className="score-scale__reject" />
                <span className="score-scale__accept" />
                <i />
              </div>
              <div className="score-scale__notes">
                <span>截图 / 失焦 / 无山野语境</span>
                <span>真诚的记录</span>
                <span>值得被记住</span>
              </div>
            </div>
            <p className="standard-section__small">
              低分照片会收到具体原因，并在隔离区保留 24 小时供你查看，之后自动清理。
              我们尽量不长期保存不值得留下的影像。
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

      <section className="camera-teaser shell">
        <div className="camera-teaser__copy">
          <p className="eyebrow">
            <span className="dot" />
            03 / FIELD CAMERA WORKSHOP
          </p>
          <h2>
            造一台
            <br />
            只属于你的
            <br />
            <em>电子相机。</em>
          </h2>
          <p>
            选择机身、镜头与胶片配方，刻上只有你知道的那句话。它会得到独一无二的序列号，
            也可以直接打开取景器，拍下下一段路。
          </p>
          <div className="camera-teaser__specs">
            <span>05 种机身</span>
            <span>03 支镜头</span>
            <span>05 款胶片</span>
            <span>无限种你的山</span>
          </div>
          <Link href="/camera" className="btn btn--signal">
            <CameraIcon />
            进入相机工坊
          </Link>
        </div>
        <div className="camera-teaser__visual">
          <span className="camera-teaser__vertical">DIGITAL FIELD CAMERA / ONE OF ONE</span>
          <CameraIllustration design={homeCamera} className="camera-object--teaser" />
          <div className="camera-teaser__caption">
            <span>GH·26·FIELD</span>
            <span>35mm · f/2.0 · PINE 400</span>
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
              提交一张照片
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
