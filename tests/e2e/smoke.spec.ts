import { expect, test } from "@playwright/test";

test("소개 화면에서 데모 장소로 들어갈 수 있다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("그날의 마음을");
  await page.getByRole("link", { name: "영일대 산책길에서 해 보기" }).click();
  await expect(page).toHaveURL(/\/p\/demo$/);
});

test("웹앱 매니페스트가 있다 (홈 화면에 추가)", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.name).toBe("기억산책");
});
