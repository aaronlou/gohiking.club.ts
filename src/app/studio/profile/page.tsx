import type { Metadata } from "next";
import { ProfileForm } from "@/components/studio/profile-form";
import { requireUser } from "@/server/auth-session";

export const metadata: Metadata = {
  title: "编辑资料",
};

export default async function StudioProfilePage() {
  const user = await requireUser("/studio/profile");

  return (
    <div className="studio-profile">
      <header className="studio-head studio-head--compact">
        <div className="studio-head__meta">
          <span className="mono">STUDIO / PROFILE</span>
          <span className="mono">MEMBER FILE</span>
        </div>
        <div className="studio-head__main">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              WHO IS BEHIND THE LENS
            </p>
            <h1>
              让大家知道
              <br />
              <em>是谁带回了这些光。</em>
            </h1>
            <p className="studio-head__note">
              注册时只留了邮箱。称呼、出发的城市和一句自我介绍，都可以在这里慢慢补上。
            </p>
          </div>
        </div>
      </header>

      <ProfileForm
        name={user.name}
        username={user.username}
        email={user.email}
        bio={user.bio ?? null}
        homeBase={user.homeBase ?? null}
      />
    </div>
  );
}
