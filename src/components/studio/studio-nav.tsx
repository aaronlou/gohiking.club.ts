"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompassIcon, GridIcon, PeopleIcon, UploadIcon } from "@/components/icons";

const links = [
  { href: "/studio", label: "我的档案", latin: "ARCHIVE", icon: GridIcon },
  { href: "/studio/activities", label: "活动", latin: "WALKS", icon: CompassIcon },
  { href: "/studio/upload", label: "放进照片", latin: "ADD", icon: UploadIcon },
  { href: "/studio/profile", label: "资料", latin: "PROFILE", icon: PeopleIcon },
];

export function StudioNav({
  rejectedCount,
  pendingRequests = 0,
}: {
  rejectedCount: number;
  pendingRequests?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="studio-nav" aria-label="工作室导航">
      {links.map((link, index) => {
        const Icon = link.icon;
        const active = pathname === link.href;
        return (
          <Link key={link.href} href={link.href} className={active ? "is-active" : ""}>
            <span className="studio-nav__index">0{index + 1}</span>
            <Icon />
            <span>{link.label}</span>
            <small>{link.latin}</small>
            {link.href === "/studio" && rejectedCount > 0 && (
              <span className="studio-nav__badge">{rejectedCount}</span>
            )}
            {link.href === "/studio/activities" && pendingRequests > 0 && (
              <span className="studio-nav__badge">{pendingRequests}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
