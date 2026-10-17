import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://omni-market-v2.vercel.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/categories", "/category/", "/products/", "/seller/"],
        disallow: ["/admin", "/dashboard", "/seller-studio", "/support", "/notifications", "/orders/", "/api/", "/login", "/register", "/checkout", "/cart"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
