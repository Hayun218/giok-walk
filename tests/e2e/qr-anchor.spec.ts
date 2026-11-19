import { expect, test } from "@playwright/test";
import { passPresence } from "./helpers";

/**
 * 포스터(QR) 기준 고정
 * 가짜 카메라가 테스트 장소의 QR 포스터를 비춘다 (playwright.config.ts 의 android-qr).
 */
test("카메라로 포스터 QR 을 비추면 그 자리에 구슬이 뜬다", async ({ page }) => {
  await page.goto("/p/e2e/view");
  await page.getByRole("button", { name: "카메라 켜기" }).click();
  const scene = page.getByTestId("place-scene");
  await expect(scene).toHaveAttribute("data-anchor", "found", { timeout: 15_000 });
  await expect(page.getByTestId("qr-hint")).toBeHidden();
  await page.waitForTimeout(800);
  await page.screenshot({ path: test.info().outputPath("qr-found.png") });
});

test("포스터를 비추고 마음을 두면, 서버가 겹치지 않는 자리를 준다", async ({ page }) => {
  await page.goto("/p/e2e/write");
  await passPresence(page);
  await page.getByRole("radio", { name: "고마움" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByPlaceholder("짧아도 괜찮아요.").fill(`포스터 앞에 둔 마음 ${Date.now()}`);
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "이 자리에 두러 가기" }).click();
  await page.getByRole("button", { name: "카메라 켜기" }).click();
  await expect(page.getByTestId("place-scene")).toHaveAttribute("data-anchor", "found", { timeout: 15_000 });
  await page.getByRole("button", { name: "이 자리에 두기" }).click();
  await expect(page.getByRole("heading", { name: "이 자리에 마음을 두었어요" })).toBeVisible();
});

test("카메라 없이 보면 그림 위 가상의 포스터에 같은 배치로 뜬다", async ({ page }) => {
  await page.goto("/p/e2e/view");
  await page.getByRole("button", { name: "카메라 없이 할게요" }).click();
  await expect(page.getByTestId("place-scene")).toHaveAttribute("data-anchor", "virtual");
});
