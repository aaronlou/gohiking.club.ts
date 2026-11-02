"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { authClient } from "@/lib/auth-client";
import { ArrowRight, SpinnerIcon } from "@/components/auth/auth-icons";

type Props = {
  name: string;
  username: string;
  email: string;
  bio: string | null;
  homeBase: string | null;
};

export function ProfileForm({ name: initialName, username, email, bio, homeBase }: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [name, setName] = useState(initialName);
  const [bioValue, setBioValue] = useState(bio ?? "");
  const [homeBaseValue, setHomeBaseValue] = useState(homeBase ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("给自己留一个称呼吧。");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await authClient.updateUser({
        name: name.trim(),
        bio: bioValue.trim(),
        homeBase: homeBaseValue.trim(),
      });

      if (updateError) {
        setError(updateError.message ?? "没有保存成功，请稍后重试。");
        return;
      }

      push("资料已经更新");
      router.refresh();
    } catch {
      setError("无法连接服务，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="profile-form" onSubmit={submit}>
      <div className="profile-form__identity">
        <div className="field">
          <label htmlFor="profile-name">
            称呼 <span>NAME</span>
          </label>
          <input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="林深"
            maxLength={30}
            autoComplete="name"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="profile-handle">
            档案用户名 <span>HANDLE</span>
          </label>
          <div className="handle-field is-readonly">
            <span>@</span>
            <input id="profile-handle" value={username} readOnly aria-readonly />
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="profile-home">
          常从哪里出发 <span>HOME BASE · 可选</span>
        </label>
        <input
          id="profile-home"
          value={homeBaseValue}
          onChange={(event) => setHomeBaseValue(event.target.value)}
          placeholder="成都"
          maxLength={40}
          autoComplete="address-level2"
        />
      </div>

      <div className="field">
        <label htmlFor="profile-bio">
          一句关于你和山的话 <span>BIO · 可选</span>
        </label>
        <textarea
          id="profile-bio"
          value={bioValue}
          onChange={(event) => setBioValue(event.target.value)}
          placeholder="例如：徒步第七年，仍然会为一次日出早起。"
          rows={3}
          maxLength={280}
        />
        <span className="field__count">{bioValue.length} / 280</span>
      </div>

      <p className="profile-form__email">
        <span className="mono">LOGIN EMAIL</span>
        {email}
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="profile-form__actions">
        <button type="submit" className="btn btn--ink" disabled={saving}>
          {saving ? (
            <>
              <SpinnerIcon className="spinner" />
              正在保存
            </>
          ) : (
            <>
              保存资料
              <ArrowRight />
            </>
          )}
        </button>
        <span className="profile-form__note">用户名用于公开档案链接，暂时不可修改。</span>
      </div>
    </form>
  );
}
