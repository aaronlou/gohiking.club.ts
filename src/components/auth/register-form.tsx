"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { deriveIdentity, withHandleSuffix } from "@/lib/identity";
import { safeNextPath } from "@/lib/utils";
import { registerSchema } from "@/lib/validation";
import { ArrowRight, EyeIcon, EyeOffIcon, SpinnerIcon } from "./auth-icons";

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查填写内容");
      return;
    }

    setLoading(true);
    try {
      const identity = deriveIdentity(parsed.data.email);
      let lastError: { message?: string } | null = null;

      // A handle derived from the email can collide with an existing member.
      // Retry with a short suffix only when the collision is about the handle.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { error: authError } = await authClient.signUp.email({
          name: identity.name,
          email: parsed.data.email,
          password: parsed.data.password,
          username: attempt === 0 ? identity.username : withHandleSuffix(identity.username),
        });

        if (!authError) {
          router.push(safeNextPath(next || "/studio"));
          router.refresh();
          return;
        }

        lastError = authError;
        const message = authError.message?.toLowerCase() ?? "";
        const handleTaken =
          message.includes("username") || message.includes("unique") || message.includes("taken");
        if (!handleTaken) break;
      }

      const message = lastError?.message?.toLowerCase() ?? "";
      if (message.includes("exist") || message.includes("email")) {
        setError("这个邮箱已经注册过。直接登录就好。");
      } else {
        setError(lastError?.message ?? "注册没有完成，请稍后重试。");
      }
    } catch {
      setError("无法连接注册服务，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form auth-form--register auth-form--minimal" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="register-email">
          邮箱 <span>EMAIL</span>
        </label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="register-password">
          密码 <span>PASSWORD · 至少 8 位</span>
        </label>
        <div className="password-field">
          <input
            id="register-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn btn--ink btn--full auth-submit" disabled={loading}>
        {loading ? (
          <>
            <SpinnerIcon className="spinner" />
            正在建立档案
          </>
        ) : (
          <>
            建立我的档案
            <ArrowRight />
          </>
        )}
      </button>

      <p className="auth-hint">
        不需要用户名。我们会先用邮箱里的名字称呼你，随时可以在工作室里改成自己的。
      </p>

      <p className="auth-terms">
        照片会接受多模态视觉模型的观看；还没进入公共档案的照片，会先在你身边留 24 小时。
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
