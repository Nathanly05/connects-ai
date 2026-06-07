import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteTitle = "Connects AI - 中文 AI 助手平台";
const siteDescription =
  "一个面向中文用户的 AI 聊天与智能创作平台，支持高速对话、深度思考、充值管理和多种支付方式。";
const siteUrl = getSiteUrl();

function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredUrl) {
    try {
      return new URL(configuredUrl);
    } catch {
      return new URL("https://connects-ai.vercel.app");
    }
  }

  return new URL("https://connects-ai.vercel.app");
}

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "Connects AI",
  title: {
    default: siteTitle,
    template: "%s | Connects AI"
  },
  description: siteDescription,
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml"
      }
    ]
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    url: "/",
    siteName: "Connects AI",
    locale: "zh_CN",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Connects AI 中文 AI 助手平台"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/opengraph-image"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
