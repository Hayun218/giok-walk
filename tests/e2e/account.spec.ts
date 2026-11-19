import { expect, test, type Page } from "@playwright/test";
import { passPresence } from "./helpers";

/**
 * 가입 없이 다 써 보고 → 엽서 화면에서 "내 엽서 간직하기"로 가입 → 다른 휴대폰에서 로그인하면 그대로 (decisions 2-10)
 */
async function leaveMemory(page: Page, letter: string) {
  await page.goto("/p/e2e/write");
  await passPresence(page);
  await page.getByRole("radio", { name: "그리움" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByPlaceholder("짧아도 괜찮아요.").fill(letter);
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "이 자리에 두러 가기" }).click();
  await page.getByRole("button", { name: "카메라 없이 할게요" }).click();
  await page.getByRole("button", { name: "이 자리에 두기" }).click();
  await expect(page.getByRole("heading", { name: "이 자리에 마음을 두었어요" })).toBeVisible();
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/me/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/me(\?|$)/);
}

test("가입하면 다른 휴대폰에서도 내 엽서가 그대로 있다", async ({ browser }, info) => {
  const email = `e2e-${info.project.name}-${Date.now()}@example.test`;
  const password = "giok-walk-1234";
  const letter = `가입 전에 남긴 마음 ${Date.now()}`;

  // 1. 가입 없이 남기기 → 엽서 화면에서 가입 권유
  const phoneA = await (await browser.newContext()).newPage();
  await leaveMemory(phoneA, letter);
  const card = phoneA.getByRole("region", { name: "내 엽서 간직하기" });
  await expect(card).toContainText("가입하지 않으면 이 휴대폰에서만 볼 수 있어요");
  await card.getByLabel("이메일").fill(email);
  await card.getByLabel("비밀번호").fill(password);
  await card.getByRole("button", { name: "가입하고 간직하기" }).click();
  await expect(phoneA.getByTestId("signup-done")).toBeVisible();

  // 2. 다른 휴대폰(새 브라우저)에서 로그인 → 내 기억에 그 엽서가 있다
  const phoneB = await (await browser.newContext()).newPage();
  await login(phoneB, email, password);
  await expect(phoneB.getByRole("region", { name: "테스트 산책길" })).toContainText(letter.slice(0, 12));
  await expect(phoneB.getByText(/가입되어 있어요/)).toBeVisible();
});

test("가입한 사람이 새 휴대폰에서 먼저 남기고 나중에 로그인해도, 그 마음이 계정으로 옮겨진다", async ({ browser }, info) => {
  const email = `e2e-claim-${info.project.name}-${Date.now()}@example.test`;
  const password = "giok-walk-5678";

  // 첫 휴대폰에서 가입해 둔다
  const first = await (await browser.newContext()).newPage();
  await leaveMemory(first, `첫 휴대폰 ${Date.now()}`);
  const card = first.getByRole("region", { name: "내 엽서 간직하기" });
  await card.getByLabel("이메일").fill(email);
  await card.getByLabel("비밀번호").fill(password);
  await card.getByRole("button", { name: "가입하고 간직하기" }).click();
  await expect(first.getByTestId("signup-done")).toBeVisible();

  // 새 휴대폰: 로그인하지 않고 먼저 남긴다
  const letter = `새 휴대폰에서 먼저 ${Date.now()}`;
  const second = await (await browser.newContext()).newPage();
  await leaveMemory(second, letter);
  // 이미 가입한 이메일로 가입하려 하면 로그인으로 안내
  const card2 = second.getByRole("region", { name: "내 엽서 간직하기" });
  await card2.getByLabel("이메일").fill(email);
  await card2.getByLabel("비밀번호").fill("whatever-1234");
  await card2.getByRole("button", { name: "가입하고 간직하기" }).click();
  await expect(card2).toContainText("이미 가입한 이메일이에요");

  await login(second, email, password);
  await expect(second.getByRole("status").filter({ hasText: "옮겼어요" })).toContainText("1개");
  await expect(second.getByRole("region", { name: "테스트 산책길" })).toContainText(letter.slice(0, 10));
});
