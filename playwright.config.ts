import { defineConfig, devices } from "@playwright/test";

// 모바일 우선: iPhone(WebKit)과 Android(Chromium) 두 기기로 돌린다.
// 카메라는 Chromium 의 가짜 장치로 대신한다 (3단계부터 사용).
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // 개발 서버는 처음 여는 화면을 그때 컴파일하므로 넉넉히 기다린다
  expect: { timeout: 10_000 },
  use: {
    // 배포본 점검: E2E_BASE_URL=https://giok-walk.vercel.app E2E_PLACE=demo pnpm test:e2e -g "QR 로"
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "on-first-retry",
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 15"] } },
    {
      name: "android",
      use: {
        ...devices["Pixel 7"],
        permissions: ["camera"],
        launchOptions: {
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
        },
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
      },
});
