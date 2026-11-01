import Link from "next/link";
import type { Metadata } from "next";
import { PhotoGrid } from "@/components/photo-grid";
import { PhotoCardSimple } from "@/components/photo-card";
import { ArrowUpRight, CalendarIcon, GridIcon, PeopleIcon } from "@/components/icons";
import { SectionHeading } from "@/components/section-heading";
import {
  groupPhotosByAuthor,
  groupPhotosByMonth,
  groupPhotosByTheme,
} from "@/lib/archive";
import { getTheme } from "@/lib/constants";
import { initials, padIndex, profileHref } from "@/lib/utils";
import type { PhotoDto } from "@/server/photos/dto";
import { getArchiveData } from "@/server/photos/queries";

export const metadata: Metadata = {
  title: "影像档案",
  description: "按主题、月份与摄影师浏览山行档案中所有入选的户外徒步影像。",
};

const tabs = [
  { id: "theme", label: "按主题", latin: "BY THEME", icon: GridIcon },
  { id: "date", label: "按时间", latin: "BY MONTH", icon: CalendarIcon },
  { id: "author", label: "按摄影师", latin: "BY AUTHOR", icon: PeopleIcon },
] as const;

type ArchiveView = (typeof tabs)[number]["id"];

function ArchiveHero({
  total,
  theme,
}: {
  total: number;
  theme: string | null;
}) {
  const currentTheme = theme ? getTheme(theme) : null;
  return (
    <header className="page-hero archive-hero">
      <div className="page-hero__top shell">
        <span className="page-hero__crumb">INDEX 02 / ARCHIVE</span>
        <span className="page-hero__crumb">GOHIKING.CLUB · FIELD ARCHIVE</span>
      </div>
      <div className="page-hero__main shell">
        <div>
          <p className="eyebrow">
            <span className="dot" />
            THE COMPLETE ARCHIVE / 全部入选影像
          </p>
          <h1>
            影像<em>档案</em>
          </h1>
        </div>
        <div className="page-hero__aside">
          <p>
            {currentTheme
              ? `正在浏览「${currentTheme.label}」主题。每一张被留下的照片，都保留着它入选的理由。`
              : "不是一次性的信息流。这里按照主题、时间与摄影师重新组织山野，让一张照片在离开首页之后仍然找得到自己的位置。"}
          </p>
          <div className="page-hero__stats">
            <div>
              <strong>{String(total).padStart(3, "0")}</strong>
              <span>入选影像</span>
            </div>
            <div>
              <strong>3.0</strong>
              <span>入选线</span>
            </div>
            <div>
              <strong>5</strong>
              <span>满分</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ViewTabs({ view, theme }: { view: ArchiveView; theme: string | null }) {
  return (
    <div className="archive-toolbar shell">
      <nav className="archive-tabs" aria-label="档案浏览方式">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const href = `/archive?view=${tab.id}${theme ? `&theme=${theme}` : ""}`;
          return (
            <Link key={tab.id} href={href} className={view === tab.id ? "is-active" : ""}>
              <Icon />
              <span>{tab.label}</span>
              <small>{tab.latin}</small>
            </Link>
          );
        })}
      </nav>
      {theme ? (
        <Link href={`/archive?view=${view}`} className="archive-filter">
          <span>{getTheme(theme).label}</span>
          <span className="archive-filter__x">清除筛选 ×</span>
        </Link>
      ) : (
        <div className="archive-themes">
          <span>THE FIELD, ORGANISED / 山野现场</span>
        </div>
      )}
    </div>
  );
}

function ThemeIndex({ photos }: { photos: PhotoDto[] }) {
  const groups = groupPhotosByTheme(photos);
  return (
    <div className="archive-themes-list">
      {groups.map((group, index) => (
        <section className="theme-group" key={group.id}>
          <div className="theme-group__head">
            <span className="theme-group__index">{padIndex(index + 1)}</span>
            <div className="theme-group__title">
              <span className="theme-chip__dot" style={{ background: group.color }} />
              <h2>{group.label}</h2>
              <span>{group.latin}</span>
            </div>
            <p>{group.note}</p>
            <span className="theme-group__count">{group.photos.length} 张</span>
          </div>
          <div className={`theme-group__grid photos-${Math.min(group.photos.length, 3)}`}>
            {group.photos.slice(0, 3).map((photo, photoIndex) => (
              <PhotoCardSimple key={photo.id} photo={photo} index={photoIndex} />
            ))}
          </div>
          <Link href={`/archive?view=theme&theme=${group.id}`} className="theme-group__link">
            查看「{group.label}」全部 {group.photos.length} 张
            <ArrowUpRight />
          </Link>
        </section>
      ))}
    </div>
  );
}

function ThemeGrid({ photos }: { photos: PhotoDto[] }) {
  return (
    <section className="archive-flat">
      <SectionHeading
        index="01"
        kicker="FILTERED BY THEME / 主题筛选"
        title={`${getTheme(photos[0]?.theme ?? "trail").label} · ${getTheme(photos[0]?.theme ?? "trail").latin}`}
        description={getTheme(photos[0]?.theme ?? "trail").note}
      />
      <PhotoGrid photos={photos} layout="grid" />
    </section>
  );
}

function DateIndex({ photos }: { photos: PhotoDto[] }) {
  const groups = groupPhotosByMonth(photos);
  return (
    <div className="date-index">
      {groups.map((group) => (
        <section className="date-group" key={group.key}>
          <div className="date-group__rail">
            <span>{group.latin}</span>
            <h2>{group.label}</h2>
            <small>{group.photos.length} 张入选</small>
          </div>
          <div className="date-group__grid">
            <PhotoGrid photos={group.photos} layout="grid" />
          </div>
        </section>
      ))}
    </div>
  );
}

function AuthorIndex({ photos }: { photos: PhotoDto[] }) {
  const authors = groupPhotosByAuthor(photos);
  return (
    <div className="author-index">
      {authors.map((author, index) => (
        <article className="author-card" key={author.id}>
          <div className="author-card__top">
            <span className="author-card__index">{padIndex(index + 1)}</span>
            <div className="author-card__identity">
              <span className="avatar avatar--lg">{initials(author.name)}</span>
              <div>
                <h2>
                  <Link href={profileHref(author.username)}>{author.name}</Link>
                </h2>
                <p>
                  @{author.username}
                  {author.homeBase ? ` · ${author.homeBase}` : ""}
                </p>
              </div>
            </div>
            <div className="author-card__stats">
              <span>
                <strong>{author.photos.length}</strong> 张入选
              </span>
              <span>
                <strong>{author.averageScore.toFixed(1)}</strong> 平均评分
              </span>
            </div>
          </div>
          <div className="author-card__strip">
            {author.photos.slice(0, 4).map((photo, photoIndex) => (
              <PhotoCardSimple key={photo.id} photo={photo} index={photoIndex} />
            ))}
          </div>
          <Link href={profileHref(author.username)} className="author-card__link">
            进入 {author.name} 的档案
            <ArrowUpRight />
          </Link>
        </article>
      ))}
    </div>
  );
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; theme?: string }>;
}) {
  const params = await searchParams;
  const allPhotos = await getArchiveData();
  const view: ArchiveView = tabs.some((tab) => tab.id === params.view)
    ? (params.view as ArchiveView)
    : "theme";
  const validTheme = params.theme && allPhotos.some((photo) => photo.theme === params.theme)
    ? params.theme
    : null;
  const photos = validTheme ? allPhotos.filter((photo) => photo.theme === validTheme) : allPhotos;

  return (
    <div className="archive-page">
      <ArchiveHero total={allPhotos.length} theme={validTheme} />
      <ViewTabs view={view} theme={validTheme} />
      <div className="archive-content shell">
        {validTheme && <ThemeGrid photos={photos} />}
        {!validTheme && view === "theme" && <ThemeIndex photos={photos} />}
        {!validTheme && view === "date" && <DateIndex photos={photos} />}
        {!validTheme && view === "author" && <AuthorIndex photos={photos} />}
      </div>
    </div>
  );
}
