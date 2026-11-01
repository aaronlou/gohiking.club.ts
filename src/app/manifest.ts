import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "山行档案 · GOHIKING.CLUB",
    short_name: "山行档案",
    description: "把走过的山野，好好收起来。",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3eee3",
    theme_color: "#f3eee3",
    orientation: "portrait",
    categories: ["photo", "travel", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "山野档案", short_name: "档案", url: "/archive" },
      { name: "放进一张照片", short_name: "放进", url: "/studio/upload" },
      { name: "我的档案", short_name: "我的", url: "/studio" },
    ],
  };
}
