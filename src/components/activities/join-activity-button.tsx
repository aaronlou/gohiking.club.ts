"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { ArrowRight, SpinnerIcon } from "@/components/auth/auth-icons";

type Props = {
  activityId: string;
  slug: string;
  joinPolicy: "approval" | "open" | "invite";
  activityStatus: "draft" | "open" | "closed" | "archived";
  membershipStatus: "pending" | "approved" | "rejected" | "left" | "removed" | null;
  isMember: boolean;
  isHost: boolean;
  isLoggedIn: boolean;
};

export function JoinActivityButton({
  activityId,
  slug,
  joinPolicy,
  activityStatus,
  membershipStatus,
  isMember,
  isHost,
  isLoggedIn,
}: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, setPending] = useState(false);

  if (isHost) {
    return (
      <Link href={`/activities/${slug}/manage`} className="btn btn--ink">
        管理这次活动
        <ArrowRight />
      </Link>
    );
  }

  if (isMember) {
    return (
      <a href="#album" className="btn btn--ink">
        看这次的照片
        <ArrowRight />
      </a>
    );
  }

  async function apply() {
    setPending(true);
    try {
      const response = await fetch(`/api/activities/${activityId}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json().catch(() => null)) as
        | { status?: "pending" | "approved"; error?: string }
        | null;
      if (!response.ok) {
        push(data?.error ?? "申请没有提交成功，请稍后重试", "error");
        return;
      }
      push(
        data?.status === "approved"
          ? "已经加入这次活动，可以看相册了"
          : "申请已经送到发起人那里，确认后就能看到相册",
      );
      router.refresh();
    } catch {
      push("网络中断，申请没有提交成功", "error");
    } finally {
      setPending(false);
    }
  }

  async function withdraw() {
    setPending(true);
    try {
      const response = await fetch(`/api/activities/${activityId}/join`, { method: "DELETE" });
      if (!response.ok) {
        push("撤回没有完成，请稍后重试", "error");
        return;
      }
      push("已经撤回这次申请");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (membershipStatus === "pending") {
    return (
      <div className="activity-join-state">
        <span className="activity-join-state__mark">等待确认</span>
        <p>申请已经在发起人那里了。确认之后，这里的相册就会打开。</p>
        <button type="button" className="text-link" onClick={withdraw} disabled={pending}>
          {pending ? "正在撤回…" : "撤回申请"}
        </button>
      </div>
    );
  }

  if (membershipStatus === "rejected") {
    return (
      <div className="activity-join-state">
        <span className="activity-join-state__mark is-muted">这次没有通过</span>
        <p>可以问问发起人，或者去看看别的活动。</p>
      </div>
    );
  }

  if (activityStatus !== "open") {
    return (
      <div className="activity-join-state">
        <span className="activity-join-state__mark is-muted">报名已结束</span>
        <p>这次同行已经出发或收队，相册仍然留给当时的同行者。</p>
      </div>
    );
  }

  if (joinPolicy === "invite") {
    return (
      <div className="activity-join-state">
        <span className="activity-join-state__mark is-muted">仅限邀请</span>
        <p>这次活动不开放申请。想加入的话，请联系发起人。</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/activities/${slug}`)}`}
        className="btn btn--ink"
      >
        {joinPolicy === "open" ? "登录后加入" : "登录后申请加入"}
        <ArrowRight />
      </Link>
    );
  }

  return (
    <div className="activity-join">
      <button type="button" className="btn btn--ink" onClick={apply} disabled={pending}>
        {pending ? <SpinnerIcon className="spinner" /> : null}
        {pending ? "正在申请…" : joinPolicy === "open" ? "加入这次活动" : "申请加入"}
        {!pending && <ArrowRight />}
      </button>
      <p>
        {joinPolicy === "open"
          ? "加入后可以看活动相册，也可以放进自己的照片。"
          : "发起人确认后，就能看到活动里的照片；不会自动公开到公共档案。"}
      </p>
    </div>
  );
}
