"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, SpinnerIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { initials } from "@/lib/utils";
import type { ActivityMemberDto } from "@/server/activities/dto";

export function ActivityManage({
  activityId,
  slug,
  status,
  requests,
  members,
}: {
  activityId: string;
  slug: string;
  status: "draft" | "open" | "closed" | "archived";
  requests: ActivityMemberDto[];
  members: ActivityMemberDto[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [username, setUsername] = useState("");

  async function decide(memberId: string, action: "approve" | "reject") {
    setBusy(memberId);
    try {
      const response = await fetch(`/api/activities/${activityId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        push(data?.error ?? "审批没有完成", "error");
        return;
      }
      push(action === "approve" ? "已经通过这份申请" : "已经婉拒这份申请");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(member: ActivityMemberDto) {
    if (!window.confirm(`要把 ${member.user.name} 从这次活动里移出吗？`)) return;
    setBusy(member.id);
    try {
      const response = await fetch(`/api/activities/${activityId}/members/${member.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        push(data?.error ?? "操作没有完成", "error");
        return;
      }
      push("已经移出这次活动");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim()) return;
    setBusy("invite");
    try {
      const response = await fetch(`/api/activities/${activityId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = (await response.json().catch(() => null)) as
        | { name?: string; error?: string }
        | null;
      if (!response.ok) {
        push(data?.error ?? "邀请没有完成", "error");
        return;
      }
      push(`${data?.name ?? "对方"} 已经加入这次活动`);
      setUsername("");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleStatus() {
    setBusy("status");
    try {
      const next = status === "open" ? "closed" : "open";
      const response = await fetch(`/api/activities/${activityId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        push("状态没有更新，请稍后重试", "error");
        return;
      }
      push(next === "closed" ? "已经结束报名" : "已经重新开放报名");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="activity-manage">
      <section className="activity-manage__block">
        <div className="activity-manage__head">
          <div>
            <span className="mono">REQUESTS / 入队申请</span>
            <h2>想一起走的人</h2>
          </div>
          <span className="activity-manage__count">{requests.length}</span>
        </div>

        {requests.length === 0 ? (
          <p className="activity-manage__empty">暂时没有新的申请。把活动链接发给同行的人，或者直接邀请他们。</p>
        ) : (
          <ul className="activity-requests">
            {requests.map((request) => (
              <li className="activity-request" key={request.id}>
                <span className="avatar">{initials(request.user.name)}</span>
                <div className="activity-request__body">
                  <div className="activity-request__top">
                    <strong>{request.user.name}</strong>
                    <a
                      href={`/hikers/${request.user.username}`}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      @{request.user.username}
                      <ArrowUpRight />
                    </a>
                  </div>
                  <p>
                    {request.user.homeBase ? `${request.user.homeBase} · ` : ""}
                    {request.user.bio ?? "还没有写下自我介绍。"}
                  </p>
                  {request.note && <blockquote>{request.note}</blockquote>}
                </div>
                <div className="activity-request__actions">
                  <button
                    type="button"
                    className="btn btn--ink btn--sm"
                    onClick={() => decide(request.id, "approve")}
                    disabled={busy === request.id}
                  >
                    {busy === request.id ? <SpinnerIcon className="spinner" /> : "通过"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => decide(request.id, "reject")}
                    disabled={busy === request.id}
                  >
                    婉拒
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="activity-manage__block">
        <div className="activity-manage__head">
          <div>
            <span className="mono">MEMBERS / 同行者</span>
            <h2>已经在这条路上的人</h2>
          </div>
          <span className="activity-manage__count">{members.length}</span>
        </div>

        <ul className="activity-members__list">
          {members.map((member) => (
            <li key={member.id}>
              <span className="avatar">{initials(member.user.name)}</span>
              <div>
                <strong>
                  {member.user.name}
                  {member.role === "host" && <span className="activity-members__role">发起人</span>}
                </strong>
                <small>
                  @{member.user.username}
                  {member.user.homeBase ? ` · ${member.user.homeBase}` : ""}
                </small>
              </div>
              {member.role !== "host" && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => remove(member)}
                  disabled={busy === member.id}
                >
                  移出
                </button>
              )}
            </li>
          ))}
        </ul>

        <form className="activity-invite" onSubmit={invite}>
          <label htmlFor="activity-invite-user">直接邀请一位同行者</label>
          <div>
            <input
              id="activity-invite-user"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="输入对方的用户名，例如 linshen"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn btn--outline" disabled={busy === "invite"}>
              {busy === "invite" ? "正在邀请…" : "邀请"}
            </button>
          </div>
        </form>
      </section>

      <section className="activity-manage__block">
        <div className="activity-manage__head">
          <div>
            <span className="mono">ACCESS / 报名状态</span>
            <h2>{status === "open" ? "正在接受同行者" : "报名已经结束"}</h2>
          </div>
        </div>
        <p className="activity-manage__empty">
          {status === "open"
            ? "结束报名后，新的申请不会再送进来，已经加入的同行者仍然可以看相册、放照片。"
            : "相册仍然对当时的同行者开放。重新开放后，可以继续接受申请。"}
        </p>
        <button type="button" className="btn btn--outline" onClick={toggleStatus} disabled={busy === "status"}>
          {busy === "status" ? "正在更新…" : status === "open" ? "结束报名" : "重新开放报名"}
        </button>
      </section>

      <a href={`/activities/${slug}`} className="text-link activity-manage__back">
        回到活动页
        <ArrowUpRight />
      </a>
    </div>
  );
}
