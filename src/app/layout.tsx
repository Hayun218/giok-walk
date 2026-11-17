import type { Metadata, Viewport } from "next";
import { Gowun_Batang, IBM_Plex_Sans_KR } from "next/font/google";
import { brand } from "@/config/brand";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

// 한글 글꼴은 용량이 커서 미리 불러오지 않는다(preload: false).
const serif = Gowun_Batang({
  weight: ["400", "700"],
  variable: "--font-serif-src",
  display: "swap",
  preload: false,
});

const sans = IBM_Plex_Sans_KR({
  weight: ["400", "500", "700"],
  variable: "--font-sans-src",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.description,
  appleWebApp: { capable: true, title: brand.name, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // 상단 상태바 색. 다크 모드를 고르면 themeInitScript 가 밤 색으로 바꾼다
  themeColor: brand.colors.paper,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme 은 첫 화면을 그리기 전에 스크립트가 정한다 (기본 light)
    <html
      lang="ko"
      data-theme="light"
      suppressHydrationWarning
      className={`${serif.variable} ${sans.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
