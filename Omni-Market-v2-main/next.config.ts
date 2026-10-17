import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the app on the standard App Router rendering path until production
  // build and route-level tests are green; experimental cache/prefetch flags
  // previously made the app harder to validate reliably.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
