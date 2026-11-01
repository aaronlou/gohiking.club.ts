"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CameraIcon, GridIcon, UploadIcon } from "@/components/icons";

const links = [
  { href: "/studio", label: "我的档案", latin: "ARCHIVE", icon: GridIcon },
  { href: "/studio/upload", label: "提交照片", latin: "SUBMIT", icon: UploadIcon },
  { href: "/camera", label: "电子相机", latin: "CAMERA", icon: CameraIcon },
];

export function StudioNav({ rejectedCount }: { rejectedCount: number }) {
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
          </Link>
        );
      })}
    </nav>
  );
}
