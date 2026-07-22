import type { Metadata } from "next";
import { getEnv } from "@/config/env";
import "./globals.css";

export function generateMetadata(): Metadata {
  const env = getEnv();
  return {
    metadataBase: new URL(env.APP_URL),
    title: "VeinzFlow — Research, routed clearly",
    description:
      "A traceable research-operations pipeline connecting Telegram capture, AI-assisted organization, Notion, and two-day team digests.",
    openGraph: {
      title: "VeinzFlow",
      description: "Research, routed clearly.",
      images: [
        {
          url: "/og.png",
          width: 1733,
          height: 908,
          alt: "VeinzFlow research operations workflow",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "VeinzFlow",
      description: "Research, routed clearly.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
