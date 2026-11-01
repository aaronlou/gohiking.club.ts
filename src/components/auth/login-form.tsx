"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/lib/validation";
import { safeNextPath } from "@/lib/utils";
import { ArrowRight, EyeIcon, EyeOffIcon, SpinnerIcon } from "./auth-icons";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查填写内容");
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (authError) {
        setError(
          authError.message?.toLowerCase().includes("invalid")
            ? "邮箱或密码不正确。再试一次，或者使用下方的演示账号。"
            : authError.message ?? "登录没有完成，请稍后重试。",
        );
        return;
      }
      router.push(safeNextPath(next));
      router.refresh();
    } catch {
      setError("无法连接登录服务，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  function useDemo() {
    setEmail("hiker@gohiking.club");
    setPassword("trailhead2026");
    setError(null);
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="login-email">
          邮箱 <span>EMAIL</span>
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="login-password">
          密码 <span>PASSWORD</span>
        </label>
        <div className="password-field">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位"
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
            正在进入档案
          </>
        ) : (
          <>
            进入我的档案
            <ArrowRight />
          </>
        )}
      </button>

      <div className="demo-account">
        <div>
          <span className="mono">DEMO MEMBER / 演示成员</span>
          <p>hiker@gohiking.club · trailhead2026</p>
        </div>
        <button type="button" onClick={useDemo}>
          填入
        </button>
      </div>

      <p className="auth-switch">
        还没有档案？{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
          创建一个
          <ArrowRight />
        </Link>
      </p>
    </form>
  );
}
