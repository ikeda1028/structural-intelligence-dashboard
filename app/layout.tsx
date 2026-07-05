import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Structural Intelligence Dashboard",
  description: "世界の重要情報を構造分析し、未来仮説とTLA事業示唆を生成するMVP"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
