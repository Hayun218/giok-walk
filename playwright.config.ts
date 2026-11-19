import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { ensureQrVideo } from "./tests/fixtures/qr-video";

// 테스트 전용 포트 (3000 은 다른 프로젝트가 쓰고 있을 수 있다)
const PORT = 3210;

// 포스터 고정 테스트용 가짜 카메라: 테스트 장소(/p/e2e)의 QR 을 비추는 영상
const QR_VIDEO = ensureQrVideo(resolve("tests/fixtures/qr-e2e.y4m"), `http://localhost:${PORT}/p/e2e`);

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
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    locale: "ko-KR",
    // 테스트 장소(/p/e2e, 서울시청) 바로 옆에 있다고 가정
    geolocation: { latitude: 37.5666, longitude: 126.9781 },
    timezoneId: "Asia/Seoul",
    trace: "on-first-retry",
  },
  projects: [
    { name: "iphone", testIgnore: /qr-anchor/, use: { ...devices["iPhone 15"], permissions: ["geolocation"] } },
    {
      name: "android",
      testIgnore: /qr-anchor/,
      use: {
        ...devices["Pixel 7"],
        permissions: ["camera", "geolocation"],
        launchOptions: {
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
        },
      },
    },
    {
      // 카메라가 QR 포스터를 비추는 상황
      name: "android-qr",
      testMatch: /qr-anchor/,
      use: {
        ...devices["Pixel 7"],
        permissions: ["camera", "geolocation"],
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            `--use-file-for-fake-video-capture=${QR_VIDEO}`,
          ],
        },
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
      },
});
