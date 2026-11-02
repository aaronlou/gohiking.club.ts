"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CompassIcon, GridIcon, MountainIcon, PeopleIcon, UploadIcon } from "./icons";

type DockUser = { name: string; username: string } | null;

/**
 * iOS Safari anchors fixed elements to the layout viewport, which sits behind
 * the browser's bottom toolbar. Measure the visual viewport and lift the dock
 * by the toolbar height so it always rests on the visible bottom edge.
 */
function useDockLift() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const toolbar = Math.round(
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      const lift = toolbar > 24 ? Math.min(toolbar, 96) : 0;
      root.style.setProperty("--dock-lift", `${lift}px`);
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    window.addEventListener("orientationchange", schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      window.removeEventListener("orientationchange", schedule);
      root.style.removeProperty("--dock-lift");
    };
  }, []);
}

export function MobileDock({ user }: { user: DockUser }) {
  const pathname = usePathname();
  useDockLift();

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
      href: "/activities",
      label: "活动",
      icon: CompassIcon,
      active: pathname.startsWith("/activities"),
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
      href: "/archive",
      label: "档案",
      icon: GridIcon,
      active: pathname.startsWith("/archive"),
      primary: false,
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
