import { expect, test } from "@playwright/test";
import { passPresence } from "./helpers";

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
      await page.addInitScript((t) => localStorage.setItem("giok-walk:theme", t), scheme);
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

const PAPER = "rgb(246, 242, 233)";
const NIGHT = "rgb(17, 22, 42)";
const bgOf = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("기본은 라이트: 휴대폰이 다크 모드여도 종이색 바탕", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await bgOf(page)).toBe(PAPER);
});

test("내 기억에서 어둡게를 고르면 밤 색, 다른 화면에도 이어진다", async ({ page }) => {
  await page.goto("/me");
  await page.getByRole("radio", { name: "어둡게" }).click();
  expect(await bgOf(page)).toBe(NIGHT);
  await page.goto("/");
  expect(await bgOf(page)).toBe(NIGHT);
  await page.goto("/me");
  await page.getByRole("radio", { name: "밝게" }).click();
  expect(await bgOf(page)).toBe(PAPER);
});

test("휴대폰 설정을 고르면 휴대폰의 라이트·다크를 따른다", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("giok-walk:theme", "system"));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await bgOf(page)).toBe(NIGHT);
  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => bgOf(page)).toBe(PAPER);
});

test("쓰기 화면의 다음 버튼은 작은 폰에서도 스크롤 없이 보인다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/p/e2e/write");
  await passPresence(page);
  await expect(page.getByRole("button", { name: "다음" })).toBeInViewport();
});
