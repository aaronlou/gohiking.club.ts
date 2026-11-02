import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/activities`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/archive`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE.url}/archive?view=author`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];
}
