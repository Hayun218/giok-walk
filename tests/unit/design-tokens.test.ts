import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generatedTokens, generatedTokensSource, readTokens } from "../../scripts/tokens-lib.mjs";

/**
 * 컬러 시스템은 BI 확정 때 바뀐다 (decisions.md D-6).
 * 바뀌어도 한 곳(tokens.css)만 고치면 되도록 아래를 지킨다.
 */
describe("컬러가 바뀌어도 한 곳만 고치면 된다", () => {
  it("자동 생성 토큰(tokens.generated.ts)이 tokens.css 와 같다 — 다르면 `pnpm design:build`", () => {
    const expected = generatedTokensSource(generatedTokens(readTokens()));
    expect(readFileSync("src/styles/tokens.generated.ts", "utf8")).toBe(expected);
  });

  it("화면 코드에 색 값(hex·rgb)을 직접 쓰지 않는다", () => {
    const allowed = new Set(["src/styles/tokens.css", "src/styles/tokens.generated.ts", "src/app/icon.svg"]);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(tsx?|css|svg)$/.test(name) && !allowed.has(path)) {
          const src = readFileSync(path, "utf8");
          const hits = src.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/g);
          if (hits) offenders.push(`${path}: ${hits.join(", ")}`);
        }
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });

  it("모든 감정에 구슬 색이 있다", () => {
    const { t, emotions } = readTokens();
    for (const e of emotions) {
      expect(t(`--orb-${e.id}-from`)).toMatch(/^#/);
      expect(t(`--orb-${e.id}-to`)).toMatch(/^#/);
    }
  });
});

// 새 컬러가 들어와도 읽기 어려워지지 않도록 대비를 검사한다 (WCAG AA 4.5:1)
function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe.each(["light", "dark"])("글자 대비 — %s 모드 (컬러 확정 때 다시 확인)", (scheme) => {
  const { t } = readTokens(undefined, undefined, scheme);
  const pairs: [string, string][] = [
    ["--color-text", "--color-bg"],
    ["--color-text-muted", "--color-bg"],
    ["--color-text", "--color-surface"],
    ["--color-accent-contrast", "--color-accent"],
    ["--color-primary-contrast", "--color-primary"],
    ["--color-on-camera", "--color-camera-bg"],
  ];
  it.each(pairs)("%s 위 %s 가 4.5:1 이상", (fg, bg) => {
    expect(contrast(t(fg), t(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
