import type { Metadata } from "next";
import Link from "next/link";
import { ActivityForm } from "@/components/activities/activity-form";
import { ArrowUpRight } from "@/components/icons";
import { requireUser } from "@/server/auth-session";

export const metadata: Metadata = {
  title: "发起一次活动",
  description: "发起一次徒步活动，邀请同行的人，把这次山行的照片收在只有成员能看到的相册里。",
};

export default async function NewActivityPage() {
  await requireUser("/activities/new");

  return (
    <div className="activity-new-page">
      <header className="page-hero activity-new-hero">
        <div className="page-hero__top shell">
          <span className="page-hero__crumb">NEW FIELD ROLL / 发起活动</span>
          <Link href="/activities" className="page-hero__crumb">
            返回活动
            <ArrowUpRight />
          </Link>
        </div>
        <div className="page-hero__main shell">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              A WALK, INVITED BY YOU
            </p>
            <h1>
              给这次同行
              <br />
              <em>一个名字。</em>
            </h1>
          </div>
          <div className="page-hero__aside">
            <p>
              只需要一个名字和日期就能建好。路线、集合点和说明可以之后再补；
              照片、成员名单与集合点，始终只对通过申请的人可见。
            </p>
          </div>
        </div>
      </header>

      <div className="shell activity-new">
        <ActivityForm />
      </div>
    </div>
  );
}
