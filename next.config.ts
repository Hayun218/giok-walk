import type { NextConfig } from "next";

// cacheComponents 는 끈다: 방문객 화면 대부분이 세션·실시간 데이터라 정적 셸 이점이 작고,
// 1인 개발 일정에서 Suspense 경계 규칙을 줄이기 위해서다 (decisions.md 2-8).
const nextConfig: NextConfig = {
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
