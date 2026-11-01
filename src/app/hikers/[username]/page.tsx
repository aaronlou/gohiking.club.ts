import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight } from "@/components/icons";
import { PhotoGrid } from "@/components/photo-grid";
import { formatDate, initials } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth-session";
import { getPhotosByUsername } from "@/server/photos/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await getPhotosByUsername(decodeURIComponent(username), null);
  if (!data) return { title: "没有找到这位徒步者" };
  return {
    title: `${data.profile.name} 的山行档案`,
    description: data.profile.bio ?? `${data.profile.name} 的户外徒步影像档案。`,
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const data = await getPhotosByUsername(decodeURIComponent(username), viewer?.id);
  if (!data) notFound();

  const { profile, photos, stats, isOwner } = data;

  return (
    <div className="profile-page">
      <header className="profile-hero shell">
        <div className="profile-hero__top">
          <span className="page-hero__crumb">HIKER FILE / 徒步者档案</span>
          <span className="page-hero__crumb">NO. {profile.id.slice(-4).toUpperCase()}</span>
        </div>
        <div className="profile-hero__main">
          <div className="profile-hero__identity">
            <span className="avatar avatar--xl">{initials(profile.name)}</span>
            <div>
              <p className="eyebrow">
                <span className="dot" />
                @{profile.username} {profile.homeBase ? `· ${profile.homeBase}` : ""}
              </p>
              <h1>{profile.name}</h1>
              <p className="profile-hero__bio">{profile.bio || "这位徒步者还没有写下自己的介绍。"}</p>
            </div>
          </div>
          <div className="profile-hero__stats">
            <div>
              <strong>{stats.accepted}</strong>
              <span>张被看见</span>
            </div>
            <div>
              <strong>{stats.averageScore ? stats.averageScore.toFixed(1) : "—"}</strong>
              <span>平均评分</span>
            </div>
            <div>
              <strong>{stats.likes}</strong>
              <span>收到敬意</span>
            </div>
            <div>
              <strong>{new Date(profile.createdAt).getFullYear()}</strong>
              <span>加入档案</span>
            </div>
          </div>
        </div>
        <div className="profile-hero__foot">
          <span>FIELD MEMBER SINCE {formatDate(profile.createdAt)}</span>
          {isOwner ? (
            <Link href="/studio" className="text-link">
              进入工作室
              <ArrowUpRight />
            </Link>
          ) : (
            <Link href="/archive?view=author" className="text-link">
              浏览所有摄影师
              <ArrowUpRight />
            </Link>
          )}
        </div>
      </header>

      <section className="profile-work shell">
        <div className="profile-work__head">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              A FEW MOMENTS / 被看见的作品
            </p>
            <h2>{photos.length > 0 ? "从山里带回来的观看" : "档案还在等第一张照片"}</h2>
          </div>
          {isOwner && (
            <Link href="/studio/upload" className="btn btn--ink">
              放进一张照片
              <ArrowUpRight />
            </Link>
          )}
        </div>
        {photos.length > 0 ? (
          <PhotoGrid photos={photos} layout="grid" />
        ) : (
          <div className="profile-empty">
            <p>这里暂时还没有与大家见面的照片。</p>
            {isOwner && (
              <Link href="/studio/upload" className="text-link">
                放进第一张
                <ArrowUpRight />
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="profile-next">
        <div className="shell profile-next__inner">
          <div>
            <span className="mono">NEXT FILE / 下一位徒步者</span>
            <p>每一张照片背后，都有人为它走过一段路。</p>
          </div>
          <Link href="/archive?view=author" className="btn btn--outline">
            浏览摄影师档案
            <ArrowUpRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
