import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://omni-market-v2.vercel.app").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/explore", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/categories", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/sell", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/refunds", priority: 0.3, changeFrequency: "monthly" as const },
  ];
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
