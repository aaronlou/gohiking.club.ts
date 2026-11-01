"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ArrowUpRight } from "@/components/icons";

export function StudioAccount() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="studio-sidebar__foot">
      <Link href="/" className="studio-out-link">
        回到公共档案
        <ArrowUpRight />
      </Link>
      <button type="button" onClick={signOut} disabled={signingOut} className="studio-signout">
        {signingOut ? "正在离开…" : "退出登录"}
      </button>
    </div>
  );
}
