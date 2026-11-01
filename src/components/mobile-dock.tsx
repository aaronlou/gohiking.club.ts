"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GridIcon, MountainIcon, PeopleIcon, UploadIcon } from "./icons";

type DockUser = { name: string; username: string } | null;

export function MobileDock({ user }: { user: DockUser }) {
  const pathname = usePathname();
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/studio")
  ) {
    return null;
  }

  const loginNext =
    pathname.startsWith("/photo/") || pathname.startsWith("/hikers/")
      ? pathname
      : "/studio";

  const items = [
    {
      href: "/",
      label: "山野",
      icon: MountainIcon,
      active:
        pathname === "/" || pathname.startsWith("/photo/") || pathname.startsWith("/hikers/"),
      primary: false,
    },
    {
      href: "/archive",
      label: "档案",
      icon: GridIcon,
      active: pathname.startsWith("/archive"),
      primary: false,
    },
    {
      href: user ? "/studio/upload" : "/login?next=/studio/upload",
      label: "放进",
      icon: UploadIcon,
      active: pathname.startsWith("/studio/upload"),
      primary: true,
    },
    {
      href: user ? "/studio" : `/login?next=${encodeURIComponent(loginNext)}`,
      label: user ? "我的" : "登录",
      icon: PeopleIcon,
      active: pathname.startsWith("/studio") && !pathname.startsWith("/studio/upload"),
      primary: false,
    },
  ];

  return (
    <nav className="mobile-dock" aria-label="移动端快捷导航">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-dock__item ${item.active ? "is-active" : ""} ${item.primary ? "is-primary" : ""}`}
            aria-current={item.active ? "page" : undefined}
          >
            <span className="mobile-dock__icon">
              <Icon />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
