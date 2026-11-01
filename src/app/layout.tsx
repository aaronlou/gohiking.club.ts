import type { Metadata, Viewport } from "next";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/instrument-sans";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "./globals.css";
import { getCurrentUser } from "@/server/auth-session";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/toast";
import { SITE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "山行档案 · 只留下值得背下山的照片",
    template: "%s · 山行档案",
  },
  description: SITE.description,
  keywords: ["户外摄影", "徒步", "山野影像", "摄影档案", "gohiking"],
  openGraph: {
    title: "山行档案 · GOHIKING.CLUB",
    description: SITE.description,
    type: "website",
    locale: "zh_CN",
    siteName: "山行档案",
  },
  twitter: {
    card: "summary_large_image",
    title: "山行档案 · GOHIKING.CLUB",
    description: SITE.description,
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3eee3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="zh-CN">
      <body>
        <a href="#main" className="skip-link">
          跳到正文
        </a>
        <div className="page-grain" aria-hidden />
        <ToastProvider>
          <SiteHeader user={user ? { name: user.name, username: user.username } : null} />
          <main id="main" className="site-main">
            {children}
          </main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
