import { expect, type Page } from "@playwright/test";

/** 쓰기 화면의 현장 확인을 지나간다 (이미 허락돼 있으면 바로 열린다) */
export async function passPresence(page: Page) {
  const allow = page.getByRole("button", { name: "지금 계신 곳 확인하기" });
  const firstStep = page.getByRole("radio", { name: "기쁨" });
  await expect(firstStep.or(allow)).toBeVisible();
  // 이미 허락돼 있으면 버튼이 잠깐 보였다가 저절로 열린다
  if (await allow.isVisible()) await allow.click({ timeout: 2000 }).catch(() => {});
  await expect(firstStep).toBeVisible();
}

/** 위치 확인 버튼이 있으면 누른다 (이미 허락돼 사라졌으면 넘어간다) */
export async function allowLocationIfAsked(page: Page) {
  const allow = page.getByRole("button", { name: "지금 계신 곳 확인하기" });
  if (await allow.isVisible().catch(() => false)) await allow.click({ timeout: 2000 }).catch(() => {});
}
