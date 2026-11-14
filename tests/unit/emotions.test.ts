import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EMOTIONS, isEmotionId, orbGradient } from "@/lib/emotions";

describe("감정 = 구슬 색", () => {
  it("감정 id 는 겹치지 않는다", () => {
    const ids = EMOTIONS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("모든 감정에 토큰 색이 정의되어 있다", () => {
    const css = readFileSync("src/styles/tokens.css", "utf8");
    for (const { id } of EMOTIONS) {
      expect(css).toContain(`--orb-${id}-from:`);
      expect(css).toContain(`--orb-${id}-to:`);
    }
  });

  it("DB 의 emotion 제약과 목록이 같다", () => {
    const sql = readFileSync("supabase/migrations/20261114000000_init.sql", "utf8");
    const match = sql.match(/emotion text not null check \(emotion in \(([^)]+)\)\)/);
    expect(match).not.toBeNull();
    const dbIds = match![1].split(",").map((s) => s.trim().replace(/'/g, ""));
    expect(dbIds.sort()).toEqual(EMOTIONS.map((e) => e.id).sort());
  });

  it("isEmotionId 는 목록에 있는 값만 통과시킨다", () => {
    expect(isEmotionId("joy")).toBe(true);
    expect(isEmotionId("angry")).toBe(false);
    expect(isEmotionId(1)).toBe(false);
  });

  it("그라데이션은 토큰 변수를 쓴다", () => {
    expect(orbGradient("calm")).toBe(
      "linear-gradient(135deg, var(--orb-calm-from), var(--orb-calm-to))",
    );
  });
});
