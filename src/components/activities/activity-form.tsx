"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, SpinnerIcon } from "@/components/auth/auth-icons";
import { ACTIVITY_DIFFICULTIES } from "@/lib/activities";
import { useToast } from "@/components/toast";

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function ActivityForm() {
  const router = useRouter();
  const { push } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    title: "",
    summary: "",
    description: "",
    region: "",
    routeName: "",
    meetingPoint: "",
    startDate: today(),
    endDate: "",
    difficulty: "moderate",
    capacity: "",
    joinPolicy: "approval",
    visibility: "listed",
  });

  function update(key: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!fields.title.trim()) {
      setError("给这次活动一个名字吧。");
      return;
    }
    if (fields.endDate && fields.endDate < fields.startDate) {
      setError("结束日期不能早于出发日期。");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...fields,
          capacity: fields.capacity ? Number(fields.capacity) : undefined,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { activity?: { slug: string }; error?: string }
        | null;

      if (!response.ok || !data?.activity) {
        setError(data?.error ?? "活动没有建立成功，请稍后重试。");
        return;
      }

      push("活动已经建立，可以邀请同行者了");
      router.push(`/activities/${data.activity.slug}`);
      router.refresh();
    } catch {
      setError("无法连接服务，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="activity-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="activity-title">
          这次活动叫什么 <span>TITLE</span>
        </label>
        <input
          id="activity-title"
          value={fields.title}
          onChange={(event) => update("title", event.target.value)}
          placeholder="例如：四姑娘山 · 长坪沟两日"
          maxLength={80}
          required
        />
      </div>

      <div className="activity-form__row activity-form__row--dates">
        <div className="field">
          <label htmlFor="activity-start">
            出发日期 <span>START</span>
          </label>
          <input
            id="activity-start"
            type="date"
            value={fields.startDate}
            onChange={(event) => update("startDate", event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="activity-end">
            结束日期 <span>END · 可留空</span>
          </label>
          <input
            id="activity-end"
            type="date"
            value={fields.endDate}
            min={fields.startDate}
            onChange={(event) => update("endDate", event.target.value)}
          />
        </div>
      </div>

      <div className="activity-form__row">
        <div className="field">
          <label htmlFor="activity-region">
            地区 <span>REGION</span>
          </label>
          <input
            id="activity-region"
            value={fields.region}
            onChange={(event) => update("region", event.target.value)}
            placeholder="例如：四川 · 小金"
            maxLength={40}
          />
        </div>
        <div className="field">
          <label htmlFor="activity-route">
            路线 <span>ROUTE</span>
          </label>
          <input
            id="activity-route"
            value={fields.routeName}
            onChange={(event) => update("routeName", event.target.value)}
            placeholder="例如：长坪沟 — 木骡子"
            maxLength={60}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="activity-summary">
          一句话介绍 <span>SUMMARY · 可选</span>
        </label>
        <input
          id="activity-summary"
          value={fields.summary}
          onChange={(event) => update("summary", event.target.value)}
          placeholder="例如：两天，走到雪山脚下再回来。"
          maxLength={140}
        />
        <span className="field__count">{fields.summary.length} / 140</span>
      </div>

      <details className="activity-form__more">
        <summary>
          <span>
            更多设置
            <small>DIFFICULTY · ACCESS · MEETING POINT</small>
          </span>
          <span className="upload-more__mark" aria-hidden />
        </summary>

        <div className="activity-form__more-body">
          <div className="field">
            <label htmlFor="activity-description">
              活动说明 <span>DESCRIPTION · 可选</span>
            </label>
            <textarea
              id="activity-description"
              value={fields.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="路线安排、需要带什么、对同行者的期待。只有加入的人能看到完整说明。"
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className="field">
            <label htmlFor="activity-meeting">
              集合点 <span>MEETING POINT · 仅成员可见</span>
            </label>
            <input
              id="activity-meeting"
              value={fields.meetingPoint}
              onChange={(event) => update("meetingPoint", event.target.value)}
              placeholder="例如：成都东站西广场，07:30"
              maxLength={120}
            />
          </div>

          <div className="activity-form__row">
            <div className="field">
              <label htmlFor="activity-difficulty">
                强度 <span>DIFFICULTY</span>
              </label>
              <select
                id="activity-difficulty"
                value={fields.difficulty}
                onChange={(event) => update("difficulty", event.target.value)}
              >
                {ACTIVITY_DIFFICULTIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {item.note}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="activity-capacity">
                人数上限 <span>CAPACITY · 可选</span>
              </label>
              <input
                id="activity-capacity"
                type="number"
                min={1}
                max={100}
                value={fields.capacity}
                onChange={(event) => update("capacity", event.target.value)}
                placeholder="不填就不限"
              />
            </div>
          </div>

          <div className="activity-form__row">
            <div className="field">
              <label htmlFor="activity-join">
                加入方式 <span>JOIN</span>
              </label>
              <select
                id="activity-join"
                value={fields.joinPolicy}
                onChange={(event) => update("joinPolicy", event.target.value)}
              >
                <option value="approval">申请后由我确认</option>
                <option value="open">任何人都可以直接加入</option>
                <option value="invite">仅限我邀请</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="activity-visibility">
                活动可见性 <span>VISIBILITY</span>
              </label>
              <select
                id="activity-visibility"
                value={fields.visibility}
                onChange={(event) => update("visibility", event.target.value)}
              >
                <option value="listed">公开列出，任何人可申请</option>
                <option value="unlisted">不列出，拿到链接才能申请</option>
                <option value="private">私密，只有成员能看到</option>
              </select>
            </div>
          </div>

          <p className="activity-form__note">
            选「公开列出」时，活动名称、日期和路线会出现在活动页；照片、成员名单和集合点始终只对通过的人可见。
          </p>
        </div>
      </details>

      {error && <p className="form-error">{error}</p>}

      <div className="activity-form__actions">
        <button type="submit" className="btn btn--ink" disabled={saving}>
          {saving ? <SpinnerIcon className="spinner" /> : null}
          {saving ? "正在建立活动" : "建立活动"}
          {!saving && <ArrowRight />}
        </button>
        <p>建好之后，把链接发给同行的人，或者直接邀请他们。</p>
      </div>
    </form>
  );
}
