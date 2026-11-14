import { expect, test } from "@playwright/test";

const PLACE = process.env.E2E_PLACE ?? "e2e";
const PLACE_NAME = PLACE === "demo" ? "영일대 산책길" : "테스트 산책길";

/**
 * 핵심 흐름: QR 진입 → 기록 → 남기기 → 다시 보기
 * 로컬 Supabase 와 시드의 테스트 장소(/p/e2e)가 있어야 한다.
 * 안드로이드는 가짜 카메라로, 아이폰(WebKit)은 "카메라 없이" 경로로 확인한다.
 */
test("QR 로 들어와 마음을 남기고, 다시 오면 내 마음이 그대로 있다", async ({ page }, info) => {
  const letter = `파도 소리가 좋았어 ${Date.now()}`;
  const withCamera = info.project.name === "android";

  // 1. QR 진입
  await page.goto(`/p/${PLACE}`);
  await expect(page.getByRole("heading", { name: PLACE_NAME })).toBeVisible();
  await page.getByRole("link", { name: "마음 남기기" }).click();

  // 2. 기록 작성
  await page.getByRole("radio", { name: "평온" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("radio", { name: /모르는 누군가에게/ }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByPlaceholder("짧아도 괜찮아요.").fill(letter);
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("radio", { name: /모두에게/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "이 자리에 두러 가기" }).click();

  // 3. 남기기 (권한은 이유를 먼저 보여 준 뒤에 묻는다)
  await expect(page.getByRole("dialog", { name: "이 자리를 비춰 볼까요?" })).toBeVisible();
  await page.getByRole("button", { name: withCamera ? "카메라 켜기" : "카메라 없이 할게요" }).click();
  await expect(page.getByTestId("place-scene")).toBeVisible();
  await page.getByRole("button", { name: "이 자리에 두기" }).click();
  await expect(page.getByRole("heading", { name: "이 자리에 마음을 두었어요" })).toBeVisible();
  await expect(page.getByText(letter)).toBeVisible();

  // 4. 다시 보기: 장소에 쌓인 마음 (모아보기)
  await page.getByRole("link", { name: "남겨진 마음 보러 가기" }).click();
  await page.getByRole("button", { name: "카메라 없이 할게요" }).click();
  await expect(page.getByTestId("place-scene")).toBeVisible();
  await page.getByRole("tab", { name: "모아보기" }).click();
  const mine = page.getByRole("list", { name: "남겨진 마음" }).getByRole("listitem").filter({ hasText: letter });
  await expect(mine).toContainText("내가 남긴 마음");

  // 5. 재방문: QR 로 다시 들어와도 내 마음이 남아 있다
  await page.goto(`/p/${PLACE}`);
  await expect(page.getByTestId("place-counts")).toContainText("내가 남긴 마음");

  // 6. 내 기억: 장소별로 모여 있다
  await page.goto("/me");
  await expect(page.getByRole("region", { name: PLACE_NAME })).toContainText(letter.slice(0, 10));
});

test("다른 사람이 남긴 공개 마음은 보이고, 신고할 수 있다", async ({ browser }) => {
  const letter = `같이 걸어서 좋았다 ${Date.now()}`;
  const author = await browser.newPage();
  await author.goto(`/p/${PLACE}/write`);
  await author.getByRole("radio", { name: "기쁨" }).click();
  await author.getByRole("button", { name: "다음" }).click();
  await author.getByRole("button", { name: "다음" }).click();
  await author.getByPlaceholder("짧아도 괜찮아요.").fill(letter);
  await author.getByRole("button", { name: "다음" }).click();
  await author.getByRole("button", { name: "이 자리에 두러 가기" }).click();
  await author.getByRole("button", { name: "카메라 없이 할게요" }).click();
  await author.getByRole("button", { name: "이 자리에 두기" }).click();
  await expect(author.getByRole("heading", { name: "이 자리에 마음을 두었어요" })).toBeVisible();

  // 다른 방문객 (새 브라우저 = 새 익명 계정)
  const context = await browser.newContext();
  const visitor = await context.newPage();
  await visitor.goto(`/p/${PLACE}/view`);
  await visitor.getByRole("button", { name: "카메라 없이 할게요" }).click();
  await visitor.getByRole("tab", { name: "모아보기" }).click();
  const item = visitor.getByRole("listitem").filter({ hasText: letter });
  await expect(item).not.toContainText("내가 남긴 마음");
  await item.getByRole("button").click();
  await visitor.getByRole("button", { name: "이 마음 신고하기" }).click();
  await visitor.getByRole("button", { name: "광고·도배" }).click();
  await expect(visitor.getByText("알려 주셔서 고마워요")).toBeVisible();
  await context.close();
});

test("없는 공유 링크는 다정하게 안내한다", async ({ page }) => {
  await page.goto("/s/00000000-0000-0000-0000-000000000000");
  await expect(page.getByText("이 마음은 더 이상 열 수 없어요.")).toBeVisible();
});
