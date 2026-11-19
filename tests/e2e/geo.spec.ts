import { expect, test } from "@playwright/test";
import { allowLocationIfAsked } from "./helpers";

/**
 * QR 없이 위치로 (decisions 3-B)
 * 위치는 휴대폰 안에서만 비교한다. 테스트 장소(/p/e2e)는 서울시청, 반경 100m.
 */
test.describe("멀리 있을 때", () => {
  test.use({ geolocation: { latitude: 35.1587, longitude: 129.1604 } }); // 부산 해운대

  test("마음 남기기는 열리지 않고, 얼마나 떨어져 있는지 알려 준다", async ({ page }) => {
    await page.goto("/p/e2e/write");
    await allowLocationIfAsked(page);
    await expect(page.getByTestId("presence-away")).toContainText("떨어져 있어요");
    await expect(page.getByRole("radio", { name: "기쁨" })).toHaveCount(0);
    // 보기는 어디서나 된다
    await page.getByRole("link", { name: "남겨진 마음 보기" }).click();
    await expect(page).toHaveURL(/\/p\/e2e\/view$/);
  });
});

test("근처의 기억 장소: 가까운 순서, 반경 안이면 '여기 계세요'", async ({ page }) => {
  await page.goto("/nearby");
  await allowLocationIfAsked(page);
  const items = page.getByRole("list", { name: "가까운 장소" }).getByRole("listitem");
  await expect(items.first()).toContainText("테스트 산책길");
  await expect(items.first()).toContainText("여기 계세요");
  await expect(page.getByRole("list", { name: "가까운 장소" })).toContainText("영일대 산책길");
  await items.first().getByRole("link").click();
  await expect(page).toHaveURL(/\/p\/e2e$/);
});

test("현장 확인을 끈 장소(데모)는 어디서나 남길 수 있다", async ({ page }) => {
  await page.goto("/p/demo/write");
  await expect(page.getByRole("radio", { name: "기쁨" })).toBeVisible();
});
