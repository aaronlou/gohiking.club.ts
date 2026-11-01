"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/utils";
import { registerSchema } from "@/lib/validation";
import { ArrowRight, EyeIcon, EyeOffIcon, SpinnerIcon } from "./auth-icons";

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    homeBase: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查填写内容");
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await authClient.signUp.email({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        username: parsed.data.username.toLowerCase(),
        homeBase: form.homeBase.trim() || undefined,
      });

      if (authError) {
        const message = authError.message?.toLowerCase() ?? "";
        if (message.includes("username") || message.includes("unique")) {
          setError("这个用户名已经被带走了，换一个试试。");
        } else if (message.includes("exist") || message.includes("email")) {
          setError("这个邮箱已经注册过。可以直接登录，或换一个邮箱。");
        } else {
          setError(authError.message ?? "注册没有完成，请稍后重试。");
        }
        return;
      }

      router.push(safeNextPath(next || "/studio"));
      router.refresh();
    } catch {
      setError("无法连接注册服务，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form auth-form--register" onSubmit={submit} noValidate>
      <div className="form-row">
        <div className="field">
          <label htmlFor="register-name">
            怎么称呼你 <span>NAME</span>
          </label>
          <input
            id="register-name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="林深"
            autoComplete="name"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="register-username">
            档案用户名 <span>HANDLE</span>
          </label>
          <div className="handle-field">
            <span>@</span>
            <input
              id="register-username"
              value={form.username}
              onChange={(event) => update("username", event.target.value.replace(/\s/g, ""))}
              placeholder="linshen"
              autoComplete="username"
              spellCheck={false}
              maxLength={20}
              required
            />
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="register-email">
            邮箱 <span>EMAIL</span>
          </label>
          <input
            id="register-email"
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="register-home">
            从哪里出发 <span>HOME BASE</span>
          </label>
          <input
            id="register-home"
            value={form.homeBase}
            onChange={(event) => update("homeBase", event.target.value)}
            placeholder="成都"
            autoComplete="address-level2"
            maxLength={40}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="register-password">
          密码 <span>PASSWORD · 至少 8 位</span>
        </label>
        <div className="password-field">
          <input
            id="register-password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            placeholder="为你的档案设一道门"
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="register-confirm">
          再输一次密码 <span>CONFIRM</span>
        </label>
        <input
          id="register-confirm"
          type={showPassword ? "text" : "password"}
          value={form.confirmPassword}
          onChange={(event) => update("confirmPassword", event.target.value)}
          placeholder="确认密码"
          autoComplete="new-password"
          required
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn btn--ink btn--full auth-submit" disabled={loading}>
        {loading ? (
          <>
            <SpinnerIcon className="spinner" />
            正在建立档案
          </>
        ) : (
          <>
            建立我的山行档案
            <ArrowRight />
          </>
        )}
      </button>

      <p className="auth-terms">
        注册即表示你同意：上传的照片会接受多模态视觉评审；未入选的照片会在 24 小时后自动清理。
        照片版权始终属于拍摄者。
      </p>

      <p className="auth-switch">
        已经有档案？{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
          直接登录
          <ArrowRight />
        </Link>
      </p>
    </form>
  );
}
