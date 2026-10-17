
import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PWAControls } from "@/components/ThemeControls";
import "./globals.css";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://omni-market-v2.vercel.app"
).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Omni Market | Buy and Sell Online in Kenya",
    template: "%s | Omni Market",
  },
  description:
    "Discover new and pre-loved products, shop online, and connect with sellers across Kenya on Omni Market.",
  applicationName: "Omni Market",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Omni Market",
  },
  icons: {
    icon: "/icons/omni-icon.svg",
    apple: "/icons/omni-icon.svg",
  },
  manifest: "/manifest.webmanifest",
  themeColor: "#151c19",
  openGraph: {
    type: "website",
    siteName: "Omni Market",
    title: "Omni Market | Buy and Sell Online in Kenya",
    description:
      "Discover new and pre-loved products and connect with sellers across Kenya.",
    url: siteUrl,
    locale: "en_KE",
  },
  twitter: {
    card: "summary_large_image",
    title: "Omni Market | Buy and Sell Online in Kenya",
    description:
      "Discover new and pre-loved products and connect with sellers across Kenya.",
  },
};

const themeInitScript = `
  try {
    const saved = localStorage.getItem("omni-theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const theme =
      saved === "dark" || saved === "light" ? saved : preferred;

    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Script
        id="omni-theme-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: themeInitScript }}
      />

      <body>
        <PWAControls />

        <Suspense
          fallback={
            <div className="h-[72px] border-b border-[#e8ebe4] bg-[#fcfcf9]" />
          }
        >
          <SiteHeader />
        </Suspense>

        <div className="page-content">{children}</div>

        <SiteFooter />
      </body>
    </html>
  );
}
