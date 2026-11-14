import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

// 웹앱 구조: 홈 화면에 추가하면 앱처럼(주소창 없이) 열린다.
// QR 로 들어온 방문객은 설치 없이 그대로 쓰고, 자주 쓰는 사람은 홈 화면에 둘 수 있다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: brand.description,
    lang: "ko",
    start_url: "/me",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: brand.colors.paper,
    theme_color: brand.colors.paper,
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
