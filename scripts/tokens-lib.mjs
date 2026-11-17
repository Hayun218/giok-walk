/**
 * tokens.css 읽기 (디자인 에셋 생성기와 테스트가 함께 쓴다)
 * CSS 변수를 그대로 쓸 수 없는 곳(앱 아이콘, 매니페스트, 공유 이미지)에는
 * 이 함수로 풀어낸 값을 src/styles/tokens.generated.ts 로 내보낸다.
 */
import { readFileSync } from "node:fs";

const DARK_BLOCK = /:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/;

function parseVars(text, into, overwrite) {
  for (const m of text.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (overwrite || !(m[1] in into)) into[m[1]] = m[2].replace(/\/\*.*?\*\//g, "").trim();
  }
  return into;
}

/** scheme: "light"(기본) 또는 "dark" — dark 는 다크 모드 블록 값을 덮어쓴다 */
export function readTokens(cssPath = "src/styles/tokens.css", emotionsPath = "src/lib/emotions.ts", scheme = "light") {
  const css = readFileSync(cssPath, "utf8");
  const dark = css.match(DARK_BLOCK)?.[1] ?? "";
  const raw = parseVars(css.replace(DARK_BLOCK, ""), {}, false);
  if (scheme === "dark") parseVars(dark, raw, true);
  const resolve = (v, depth = 0) =>
    depth > 8 ? v : v.replace(/var\((--[a-z0-9-]+)\)/g, (_, n) => (n in raw ? resolve(raw[n], depth + 1) : `var(${n})`));
  const t = (name) => resolve(raw[name] ?? "");
  const emotions = [...readFileSync(emotionsPath, "utf8").matchAll(/\{ id: "([a-z]+)", label: "([^"]+)" \}/g)].map(
    (m) => ({ id: m[1], label: m[2] }),
  );
  return { raw, t, emotions };
}

/** 코드에서 쓸 풀린 값 (hex) */
export function generatedTokens({ t, emotions }) {
  return {
    paper: t("--palette-paper"),
    night: t("--palette-night"),
    ink: t("--palette-ink"),
    inkMuted: t("--palette-ink-muted"),
    accent: t("--color-accent"),
    orbs: Object.fromEntries(
      ["brand", ...emotions.map((e) => e.id)].map((id) => [id, { from: t(`--orb-${id}-from`), to: t(`--orb-${id}-to`) }]),
    ),
  };
}

export function generatedTokensSource(tokens) {
  return (
    "// 자동 생성 파일 — 직접 고치지 말 것. src/styles/tokens.css 를 고친 뒤 `pnpm design:build`.\n" +
    "// CSS 변수를 쓸 수 없는 곳(앱 아이콘·매니페스트·공유 이미지)에서만 쓴다. 화면에서는 CSS 변수를 쓴다.\n" +
    `export const tokens = ${JSON.stringify(tokens, null, 2)} as const;\n`
  );
}
