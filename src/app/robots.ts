import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio", "/api/", "/login", "/register", "/activities/*/manage"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
