import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "牧山式インテリジェンスリサーチ",
  description: "政治・経済・思想・テクノロジーの構造から、組織と個人への影響を可視化するリサーチダッシュボード"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
