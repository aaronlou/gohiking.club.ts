"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn, initials } from "@/lib/utils";
import { ArrowUpRight, CloseIcon, MenuIcon, UploadIcon } from "./icons";
import { ContourMark, Wordmark } from "./logo";

type HeaderUser = {
  name: string;
  username: string;
} | null;

const navItems = [
  { href: "/archive", label: "影像档案", latin: "ARCHIVE" },
  { href: "/#this-week", label: "本期山脊", latin: "SELECTS" },
  { href: "/#standard", label: "如何观看", latin: "HOW WE LOOK" },
];

export function SiteHeader({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    return () => document.body.classList.remove("menu-open");
  }, [open]);

  const uploadHref = user ? "/studio/upload" : "/login?next=/studio/upload";

  return (
    <>
      <header className={cn(
          "site-header",
          scrolled && "is-scrolled",
          open && "is-menu-open",
        )}>
        <div className="site-header__inner">
          <Link href="/" className="brand" aria-label="山行档案首页">
            <ContourMark />
            <Wordmark />
          </Link>

          <nav className="site-nav" aria-label="主导航">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "site-nav__link",
                  pathname === item.href && "is-active",
                )}
              >
                <span>{item.label}</span>
                <span className="site-nav__latin">{item.latin}</span>
              </Link>
            ))}
          </nav>

          <div className="site-header__actions">
            <Link href={uploadHref} className="btn btn--ink btn--sm header-upload">
              <UploadIcon />
              <span>放进照片</span>
            </Link>
            {user ? (
              <Link href="/studio" className="header-user" aria-label={`进入 ${user.name} 的工作室`}>
                <span className="avatar avatar--sm">{initials(user.name)}</span>
                <span className="header-user__name">{user.name}</span>
              </Link>
            ) : (
              <Link href="/login" className="header-login">
                成员入口
                <ArrowUpRight />
              </Link>
            )}
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "关闭菜单" : "打开菜单"}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      <div id="mobile-menu" className={cn("mobile-menu", open && "is-open")} aria-hidden={!open}>
        <div className="mobile-menu__top">
          <span className="eyebrow eyebrow--light">
            <span className="dot" />
            INDEX / 目录
          </span>
          <span className="mono">01—04</span>
        </div>
        <nav className="mobile-menu__nav" aria-label="移动端导航">
          {navItems.map((item, index) => (
            <Link key={item.href} href={item.href} tabIndex={open ? 0 : -1}>
              <span className="mobile-menu__index">{String(index + 1).padStart(2, "0")}</span>
              <span className="mobile-menu__label">{item.label}</span>
              <span className="mobile-menu__latin">{item.latin}</span>
              <ArrowUpRight />
            </Link>
          ))}
        </nav>
        <div className="mobile-menu__foot">
          {user ? (
            <Link href="/studio" tabIndex={open ? 0 : -1} className="btn btn--paper">
              进入我的档案
              <ArrowUpRight />
            </Link>
          ) : (
            <Link href="/login" tabIndex={open ? 0 : -1} className="btn btn--paper">
              成员入口
              <ArrowUpRight />
            </Link>
          )}
          <p>为户外徒步者建立的影像档案馆。</p>
        </div>
      </div>
    </>
  );
}
