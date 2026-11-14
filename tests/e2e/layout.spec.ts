import { expect, test } from "@playwright/test";

/**
 * 휴대폰 규격 + 다크 모드 점검
 * 작은 폰(320) ~ 큰 폰(430) 에서 가로 스크롤이 생기지 않고, 다크 모드에서 바탕색이 바뀌는지 본다.
 */
const SIZES = [
  { name: "작은 폰 320×568", width: 320, height: 568 },
  { name: "갤럭시 360×780", width: 360, height: 780 },
  { name: "아이폰 SE 375×667", width: 375, height: 667 },
  { name: "아이폰 프로맥스 430×932", width: 430, height: 932 },
];
const PAGES = ["/", "/p/e2e", "/p/e2e/write", "/me", "/s/00000000-0000-0000-0000-000000000000", "/admin"];

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "android", "화면 크기는 직접 바꾸므로 한 기기로만 돌린다");
});

for (const scheme of ["light", "dark"] as const) {
  for (const size of SIZES) {
    test(`${scheme} · ${size.name}: 가로로 넘치지 않는다`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: size.width, height: size.height });
      for (const path of PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} 가 ${overflow}px 넘침`).toBeLessThanOrEqual(0);
      }
    });
  }
}

test("다크 모드에서는 밤 색 바탕, 라이트 모드에서는 종이색 바탕", async ({ page }) => {
  const bg = async () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  expect(await bg()).toBe("rgb(246, 242, 233)");
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await bg()).toBe("rgb(17, 22, 42)");
});

test("쓰기 화면의 다음 버튼은 작은 폰에서도 스크롤 없이 보인다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/p/e2e/write");
  await expect(page.getByRole("button", { name: "다음" })).toBeInViewport();
});
