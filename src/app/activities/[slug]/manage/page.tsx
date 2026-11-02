import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ActivityManage } from "@/components/activities/activity-manage";
import { ArrowUpRight } from "@/components/icons";
import { formatActivityRange } from "@/lib/activities";
import { requireUser } from "@/server/auth-session";
import { getActivityForManage } from "@/server/activities/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "管理活动",
  robots: { index: false, follow: false },
};

export default async function ManageActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser(`/activities/${slug}/manage`);
  const data = await getActivityForManage(slug, user.id);
  if (!data) notFound();

  return (
    <div className="activity-manage-page">
      <header className="page-hero activity-manage-hero">
        <div className="page-hero__top shell">
          <Link href={`/activities/${slug}`} className="page-hero__crumb">
            返回活动
            <ArrowUpRight />
          </Link>
          <span className="page-hero__crumb">HOST ONLY / 仅发起人可见</span>
        </div>
        <div className="page-hero__main shell">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              HOST DESK / 发起人工作台
            </p>
            <h1>{data.activity.title}</h1>
            <p className="activity-manage-hero__meta">
              {formatActivityRange(data.activity.startDate, data.activity.endDate)}
              {data.activity.region ? ` · ${data.activity.region}` : ""} ·{" "}
              {data.activity.memberCount} 人同行
            </p>
          </div>
        </div>
      </header>

      <div className="shell">
        <ActivityManage
          activityId={data.activity.id}
          slug={data.activity.slug}
          status={data.activity.status}
          requests={data.requests}
          members={data.members}
        />
      </div>
    </div>
  );
}
