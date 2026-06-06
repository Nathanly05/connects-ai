import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Connects AI",
  description: "中文 AI 聊天平台"
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
