import { StudioAccount } from "@/components/studio/studio-account";
import { StudioNav } from "@/components/studio/studio-nav";
import { initials } from "@/lib/utils";
import { requireUser } from "@/server/auth-session";
import { getStudioStats } from "@/server/photos/queries";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/studio");
  const stats = await getStudioStats(user.id);

  return (
    <div className="studio-page">
      <div className="studio-shell shell">
        <aside className="studio-sidebar">
          <div className="studio-identity">
            <span className="avatar avatar--lg">{initials(user.name)}</span>
            <div>
              <span className="mono">MEMBER / 档案成员</span>
              <strong>{user.name}</strong>
              <small>
                @{user.username}
                {user.homeBase ? ` · ${user.homeBase}` : ""}
              </small>
            </div>
          </div>

          <StudioNav rejectedCount={stats.rejected} />

          <div className="studio-sidebar__card">
            <span className="mono">FIELD NOTE</span>
            <p>“照片不是证据，是你曾经认真看过世界的证明。”</p>
            <span className="studio-sidebar__sign">GOHIKING.CLUB</span>
          </div>

          <StudioAccount />
        </aside>

        <div className="studio-main">{children}</div>
      </div>
    </div>
  );
}
