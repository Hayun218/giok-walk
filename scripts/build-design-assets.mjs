#!/usr/bin/env node
/**
 * 디자인 시스템 에셋 만들기
 * ─────────────────────────────────────────────
 * src/styles/tokens.css (코드가 쓰는 유일한 값) 를 읽어서 아래를 만든다.
 *   design/design-system.svg   한 장짜리 시트: 컬러·서체·간격·반경·오브젝트·아이콘
 *   design/assets/*.svg        피그마로 끌어다 놓을 개별 에셋 (구슬 6종, 봉투, 소인, 엽서 카드, 앱 아이콘)
 *   design/tokens.json         W3C 디자인 토큰 형식 (피그마 변수 가져오기 플러그인용)
 * 토큰 값을 바꾼 뒤 `pnpm design:build` 를 다시 돌리면 에셋도 같이 바뀐다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { generatedTokens, generatedTokensSource, readTokens } from "./tokens-lib.mjs";

const tokenSet = readTokens();
const { raw, t, emotions } = tokenSet;
const dark = readTokens(undefined, undefined, "dark");

const palette = Object.keys(raw)
  .filter((k) => k.startsWith("--palette-"))
  .map((k) => ({ name: k.replace("--palette-", ""), value: t(k) }));
const roles = Object.keys(raw)
  .filter((k) => k.startsWith("--color-"))
  .map((k) => ({ name: k.replace("--color-", ""), value: t(k), ref: raw[k] }));
const spaces = Object.keys(raw)
  .filter((k) => /^--space-\d+$/.test(k))
  .map((k) => ({ name: k.replace("--", ""), rem: parseFloat(t(k)) }));
const radii = Object.keys(raw)
  .filter((k) => k.startsWith("--radius-"))
  .map((k) => ({ name: k.replace("--radius-", ""), rem: parseFloat(t(k)) }));
const textSizes = Object.keys(raw)
  .filter((k) => /^--text-(xs|sm|md|lg|xl|2xl)$/.test(k))
  .map((k) => ({ name: k.replace("--text-", ""), px: parseFloat(t(k)) * 16 }));

const FONT_TITLE = "Gowun Batang";
const FONT_BODY = "IBM Plex Sans KR";
const FONT_DATE = "IBM Plex Mono";
const INK = t("--palette-ink");
const MUTED = t("--palette-ink-muted");
const PAPER = t("--palette-paper");
const LINE = t("--palette-line");
const ACCENT = t("--color-accent");
const WHITE = t("--palette-white");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (x, y, s, { size = 14, font = FONT_BODY, fill = INK, weight = 400, anchor = "start", spacing = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${
    spacing ? ` letter-spacing="${spacing}"` : ""
  }>${esc(s)}</text>`;

// ── 오브젝트 ──────────────────────────────────
const gradDef = (id, from, to) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;

/** 구슬: 기본 도형. 그라데이션은 왼쪽 위 → 오른쪽 아래 (BI 규칙) */
const orb = (cx, cy, r, gradId) =>
  `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gradId})"/>` +
  `<ellipse cx="${cx - r * 0.35}" cy="${cy - r * 0.4}" rx="${r * 0.3}" ry="${r * 0.17}" fill="#fff" opacity=".5" transform="rotate(-30 ${
    cx - r * 0.35
  } ${cy - r * 0.4})"/></g>`;

/** 편지 봉투: 장소가 고를 수 있는 두 번째 오브젝트. 봉인 자리에 감정 구슬 */
const envelope = (x, y, w, gradId) => {
  const h = w * 0.66;
  return (
    `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.05}" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M${x + 2} ${y + 4} L${x + w / 2} ${y + h * 0.55} L${x + w - 2} ${y + 4}" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
    orb(x + w / 2, y + h * 0.55, w * 0.11, gradId) +
    `</g>`
  );
};

/** 소인: 장소명 + 날짜. 장소마다 바뀌는 가변 요소 */
const stamp = (cx, cy, r, place, date, gradId) =>
  `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${INK}" stroke-width="2"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${r - 6}" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="3 3"/>` +
  orb(cx, cy, r * 0.28, gradId) +
  text(cx, cy - r * 0.45, place, { size: r * 0.17, font: FONT_TITLE, anchor: "middle", weight: 700 }) +
  text(cx, cy + r * 0.6, date, { size: r * 0.13, font: FONT_DATE, anchor: "middle", spacing: 1.5 }) +
  `</g>`;

/** 엽서 카드 = 오브젝트를 눌렀을 때 열리는 편지 (decisions 1-5) */
const letterCard = (x, y, w, gradId, { to, letter, place, date }) => {
  const h = w * 1.25;
  const lines = letter.split(" ").reduce((acc, word) => {
    const last = acc[acc.length - 1];
    if (last !== undefined && (last + " " + word).length <= 15) acc[acc.length - 1] = last + " " + word;
    else acc.push(word);
    return acc;
  }, []);
  return (
    `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${WHITE}" stroke="${LINE}"/>` +
    text(x + 24, y + 40, to, { size: 13, fill: MUTED }) +
    lines.map((l, i) => text(x + 24, y + 80 + i * 30, l, { size: 19, font: FONT_TITLE })).join("") +
    `<line x1="${x + 24}" y1="${y + h - 70}" x2="${x + w - 24}" y2="${y + h - 70}" stroke="${LINE}"/>` +
    text(x + 24, y + h - 40, `${date} · ${place}`, { size: 12, font: FONT_DATE, fill: MUTED, spacing: 1.5 }) +
    stamp(x + w - 58, y + h - 120, 38, place, date.slice(2), gradId) +
    `</g>`
  );
};

const appIcon = (x, y, s) =>
  `<g><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.22}" fill="${INK}"/>${orb(x + s / 2, y + s / 2, s * 0.27, "g-brand")}</g>`;

const allGrads =
  gradDef("g-brand", t("--orb-brand-from"), t("--orb-brand-to")) +
  emotions.map((e) => gradDef(`g-${e.id}`, t(`--orb-${e.id}-from`), t(`--orb-${e.id}-to`))).join("");

const svgDoc = (w, h, body, bg = null) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  `<defs>${allGrads}</defs>${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ""}${body}</svg>\n`;

// ── 시트 ──────────────────────────────────────
const W = 1440;
const PAD = 80;
let y = 0;
const parts = [];
const section = (num, title, note) => {
  y += 72;
  parts.push(text(PAD, y, num, { size: 13, font: FONT_DATE, fill: ACCENT, spacing: 2 }));
  parts.push(text(PAD + 44, y, title, { size: 26, font: FONT_TITLE, weight: 700 }));
  if (note) parts.push(text(PAD + 44, y + 26, note, { size: 14, fill: MUTED }));
  y += note ? 56 : 36;
};

// 머리말
y = 110;
parts.push(orb(PAD + 22, y - 12, 22, "g-brand"));
parts.push(text(PAD + 60, y, "기억산책 디자인 시스템", { size: 40, font: FONT_TITLE, weight: 700 }));
parts.push(text(W - PAD, y - 18, "v0 · 임시 · 2026-11-14", { size: 13, font: FONT_DATE, fill: MUTED, anchor: "end", spacing: 1.5 }));
parts.push(text(W - PAD, y + 2, "출처: BI 시스템 초안(11/14) · 확정 컬러 11/18경 반영 예정", { size: 13, fill: MUTED, anchor: "end" }));
y += 30;
parts.push(text(PAD, y + 10, "코드의 src/styles/tokens.css 에서 자동 생성. 값은 그 파일에서만 바꾼다.", { size: 15, fill: MUTED }));
y += 20;

// 01 원시 팔레트
section("01", "컬러 · 원시 팔레트", "색은 구슬에만 쓰고, 나머지는 잉크와 종이 두 색으로 둔다 (BI 원칙).");
const PER_ROW = 9;
palette.forEach((p, i) => {
  const x = PAD + (i % PER_ROW) * 142;
  const rowY = y + Math.floor(i / PER_ROW) * 170;
  parts.push(`<rect x="${x}" y="${rowY}" width="126" height="96" rx="12" fill="${p.value}" stroke="${LINE}"/>`);
  parts.push(text(x, rowY + 122, p.name, { size: 14, weight: 500 }));
  parts.push(text(x, rowY + 142, p.value.toUpperCase(), { size: 12, font: FONT_DATE, fill: MUTED }));
});
y += Math.ceil(palette.length / PER_ROW) * 170 - 10;

// 02 역할 토큰
section("02", "컬러 · 역할 토큰", "컴포넌트는 역할 토큰만 쓴다. BI가 확정되면 오른쪽(원시 색)만 바뀐다.");
const colW = (W - PAD * 2) / 3;
roles.forEach((r, i) => {
  const cx = PAD + (i % 3) * colW;
  const cy = y + Math.floor(i / 3) * 52;
  parts.push(`<rect x="${cx}" y="${cy}" width="36" height="36" rx="8" fill="${r.value}" stroke="${LINE}"/>`);
  parts.push(text(cx + 50, cy + 16, `color-${r.name}`, { size: 14, weight: 500 }));
  parts.push(text(cx + 50, cy + 34, `${r.ref.startsWith("var(") ? r.ref.replace(/var\(--|\)/g, "") + "  " : ""}${r.value.toUpperCase()}`, { size: 12, font: FONT_DATE, fill: MUTED }));
});
y += Math.ceil(roles.length / 3) * 52 + 10;

// 03 감정 구슬
section("03", "감정 = 구슬 색", "방문객은 색 하나를 고르면 감정도 함께 고른 것이 된다. 설렘·고마움은 BI 초안에 없는 임시값.");
emotions.forEach((e, i) => {
  const cx = PAD + 60 + i * 210;
  parts.push(orb(cx, y + 60, 56, `g-${e.id}`));
  parts.push(text(cx, y + 152, e.label, { size: 18, font: FONT_TITLE, anchor: "middle", weight: 700 }));
  parts.push(text(cx, y + 174, `${e.id}`, { size: 12, font: FONT_DATE, fill: MUTED, anchor: "middle" }));
  parts.push(
    text(cx, y + 192, `${t(`--orb-${e.id}-from`).toUpperCase()} → ${t(`--orb-${e.id}-to`).toUpperCase()}`, {
      size: 11, font: FONT_DATE, fill: MUTED, anchor: "middle",
    }),
  );
});
y += 216;

// 04 서체
section("04", "서체", "제목은 명조(고운바탕), UI는 고딕(IBM Plex Sans KR), 날짜는 고정폭 숫자 + 넓은 자간.");
const sample = "그날의 마음을 이 자리에 두고 가요";
const typeRows = [
  { label: "제목 2xl · Gowun Batang 700", size: 28, font: FONT_TITLE, weight: 700 },
  { label: "제목 xl · Gowun Batang 700", size: 22, font: FONT_TITLE, weight: 700 },
  { label: "편지 lg · Gowun Batang 400", size: 18, font: FONT_TITLE, weight: 400 },
  { label: "본문 md · IBM Plex Sans KR 400", size: 16, font: FONT_BODY, weight: 400 },
  { label: "버튼 md · IBM Plex Sans KR 500", size: 16, font: FONT_BODY, weight: 500 },
  { label: "보조 sm · IBM Plex Sans KR 400", size: 14, font: FONT_BODY, weight: 400, fill: MUTED },
  { label: "캡션 xs · IBM Plex Sans KR 400", size: 12, font: FONT_BODY, weight: 400, fill: MUTED },
];
typeRows.forEach((r) => {
  parts.push(text(PAD, y + 4, r.label, { size: 12, font: FONT_DATE, fill: MUTED }));
  parts.push(text(PAD + 330, y + 6, sample, { size: r.size, font: r.font, weight: r.weight, fill: r.fill ?? INK }));
  y += Math.max(r.size + 18, 34);
});
parts.push(text(PAD, y + 6, "날짜 · 고정폭, 자간 0.12em", { size: 12, font: FONT_DATE, fill: MUTED }));
parts.push(text(PAD + 330, y + 8, "2026.11.14 · 영일대", { size: 16, font: FONT_DATE, spacing: 2 }));
y += 30;
parts.push(text(PAD, y + 14, `글자 크기 토큰: ${textSizes.map((s) => `${s.name} ${s.px}px`).join(" · ")}`, { size: 13, fill: MUTED }));
y += 24;

// 05 간격·반경
section("05", "간격 · 반경", "간격은 4px 단위. 원(구슬)이 기본 도형이라 원형 버튼은 radius-full.");
spaces.forEach((s, i) => {
  const px = s.rem * 16;
  const bx = PAD + i * 72;
  parts.push(`<rect x="${bx}" y="${y + 48 - px}" width="${px}" height="${px}" fill="${ACCENT}" opacity=".85" rx="2"/>`);
  parts.push(text(bx, y + 72, `${s.name.replace("space-", "s")}`, { size: 12, font: FONT_DATE }));
  parts.push(text(bx, y + 88, `${px}px`, { size: 11, font: FONT_DATE, fill: MUTED }));
});
radii.forEach((r, i) => {
  const px = Math.min(r.rem * 16, 32);
  const bx = PAD + 720 + i * 150;
  parts.push(`<rect x="${bx}" y="${y}" width="64" height="64" rx="${px}" fill="${PAPER}" stroke="${INK}" stroke-width="1.5"/>`);
  parts.push(text(bx, y + 88, `radius-${r.name}`, { size: 12, font: FONT_DATE }));
});
y += 104;

// 06 오브젝트
section("06", "오브젝트", "장소가 오브젝트 종류를 정하고, 방문객은 색(감정)만 고른다. 소인은 장소명·날짜만 바뀐다.");
parts.push(orb(PAD + 70, y + 80, 64, "g-calm"));
parts.push(text(PAD + 70, y + 190, "구슬 (기본)", { size: 14, weight: 500, anchor: "middle" }));
parts.push(envelope(PAD + 200, y + 30, 170, "g-love"));
parts.push(text(PAD + 285, y + 190, "편지 봉투", { size: 14, weight: 500, anchor: "middle" }));
parts.push(stamp(PAD + 520, y + 80, 70, "영일대", "26.11.14", "g-brand"));
parts.push(text(PAD + 520, y + 190, "소인 (가변)", { size: 14, weight: 500, anchor: "middle" }));
parts.push(appIcon(PAD + 650, y + 20, 120));
parts.push(text(PAD + 710, y + 190, "앱 아이콘 (임시)", { size: 14, weight: 500, anchor: "middle" }));
parts.push(
  letterCard(PAD + 860, y - 20, 300, "g-calm", {
    to: "모르는 누군가에게",
    letter: "바다가 조용해서 오래 서 있었어. 내년에 또 오자.",
    place: "영일대",
    date: "2026.11.14",
  }),
);
parts.push(text(PAD + 1010, y + 380, "엽서 카드 = 오브젝트를 열면 보이는 편지", { size: 14, weight: 500, anchor: "middle" }));
y += 420;

// 07 카메라 화면 위
section("07", "카메라 화면 위 (어두운 배경)", "구슬이 가장 빛나 보이는 조건. 글자는 종이색.");
parts.push(`<rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="200" rx="20" fill="${t("--color-camera-bg")}"/>`);
emotions.forEach((e, i) => {
  const cx = PAD + 120 + i * 190;
  const cy = y + 90 + (i % 2 ? -24 : 18);
  parts.push(orb(cx, cy, 30 + (i % 3) * 8, `g-${e.id}`));
});
parts.push(text(PAD + 32, y + 176, "이 자리에 남겨진 마음 12개", { size: 15, fill: t("--color-on-camera") }));
y += 240;

// 08 다크 모드
section("08", "다크 모드", "휴대폰 설정을 따른다. 역할 토큰 값만 바뀌고 화면 코드는 같다. (임시값)");
{
  const panelH = 320;
  parts.push(`<rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="${panelH}" rx="20" fill="${dark.t("--color-bg")}"/>`);
  roles.forEach((r, i) => {
    const cx = PAD + 32 + (i % 3) * ((W - PAD * 2 - 64) / 3);
    const cy = y + 32 + Math.floor(i / 3) * 52;
    const v = dark.t(`--color-${r.name}`);
    parts.push(`<rect x="${cx}" y="${cy}" width="36" height="36" rx="8" fill="${v}" stroke="${dark.t("--color-border")}"/>`);
    parts.push(text(cx + 50, cy + 16, `color-${r.name}`, { size: 14, weight: 500, fill: dark.t("--color-text") }));
    parts.push(text(cx + 50, cy + 34, v.toUpperCase(), { size: 12, font: FONT_DATE, fill: dark.t("--color-text-muted") }));
  });
  const by = y + 32 + Math.ceil(roles.length / 3) * 52 + 4;
  parts.push(`<rect x="${PAD + 32}" y="${by}" width="220" height="48" rx="24" fill="${dark.t("--color-primary")}"/>`);
  parts.push(text(PAD + 142, by + 30, "마음 남기기", { size: 16, weight: 500, anchor: "middle", fill: dark.t("--color-primary-contrast") }));
  parts.push(`<rect x="${PAD + 268}" y="${by}" width="220" height="48" rx="24" fill="${dark.t("--color-accent")}"/>`);
  parts.push(text(PAD + 378, by + 30, "이 자리에 두기", { size: 16, weight: 500, anchor: "middle", fill: dark.t("--color-accent-contrast") }));
  y += panelH + 20;
}

const sheet = svgDoc(W, y + 40, parts.join(""), PAPER);

// ── 내보내기 ──────────────────────────────────
mkdirSync("design/assets", { recursive: true });
writeFileSync("design/design-system.svg", sheet);
for (const e of emotions) writeFileSync(`design/assets/orb-${e.id}.svg`, svgDoc(128, 128, orb(64, 64, 56, `g-${e.id}`)));
writeFileSync("design/assets/orb-brand.svg", svgDoc(128, 128, orb(64, 64, 56, "g-brand")));
writeFileSync("design/assets/envelope.svg", svgDoc(200, 140, envelope(15, 15, 170, "g-love")));
writeFileSync("design/assets/stamp.svg", svgDoc(160, 160, stamp(80, 80, 72, "영일대", "26.11.14", "g-brand")));
writeFileSync("design/assets/app-icon.svg", svgDoc(256, 256, appIcon(0, 0, 256)));
writeFileSync(
  "design/assets/letter-card.svg",
  svgDoc(340, 420, letterCard(20, 20, 300, "g-calm", {
    to: "모르는 누군가에게",
    letter: "바다가 조용해서 오래 서 있었어. 내년에 또 오자.",
    place: "영일대",
    date: "2026.11.14",
  })),
);

// W3C Design Tokens (피그마 변수 가져오기 플러그인용)
const tokens = {
  color: {
    palette: Object.fromEntries(palette.map((p) => [p.name, { $type: "color", $value: p.value }])),
    role: Object.fromEntries(roles.map((r) => [r.name, { $type: "color", $value: r.value }])),
    roleDark: Object.fromEntries(roles.map((r) => [r.name, { $type: "color", $value: dark.t(`--color-${r.name}`) }])),
    orb: Object.fromEntries(
      [{ id: "brand", label: "브랜드" }, ...emotions].map((e) => [
        e.id,
        {
          from: { $type: "color", $value: t(`--orb-${e.id}-from`) },
          to: { $type: "color", $value: t(`--orb-${e.id}-to`) },
          $description: e.label,
        },
      ]),
    ),
  },
  font: {
    title: { $type: "fontFamily", $value: FONT_TITLE },
    body: { $type: "fontFamily", $value: FONT_BODY },
    date: { $type: "fontFamily", $value: FONT_DATE },
  },
  fontSize: Object.fromEntries(textSizes.map((s) => [s.name, { $type: "dimension", $value: `${s.px}px` }])),
  space: Object.fromEntries(spaces.map((s) => [s.name.replace("space-", ""), { $type: "dimension", $value: `${s.rem * 16}px` }])),
  radius: Object.fromEntries(radii.map((r) => [r.name, { $type: "dimension", $value: `${r.rem * 16}px` }])),
};
writeFileSync("design/tokens.json", JSON.stringify(tokens, null, 2) + "\n");

console.log(`디자인 에셋을 만들었어요: design/design-system.svg 외 에셋 ${emotions.length + 5}개, design/tokens.json`);

// ── 코드용 생성물 (CSS 변수를 못 쓰는 곳) ─────────
writeFileSync("src/styles/tokens.generated.ts", generatedTokensSource(generatedTokens(tokenSet)));
writeFileSync(
  "src/app/icon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <!-- 자동 생성 (pnpm design:build). 임시 앱 아이콘: BI 초안 I2 "밤 위의 구슬" -->
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t("--orb-brand-from")}"/><stop offset="1" stop-color="${t("--orb-brand-to")}"/></linearGradient></defs>
  <rect width="64" height="64" rx="14" fill="${t("--palette-ink")}"/>
  <circle cx="32" cy="32" r="17" fill="url(#g)"/>
  <ellipse cx="26" cy="25" rx="5" ry="3" fill="#fff" opacity=".45" transform="rotate(-30 26 25)"/>
</svg>
`,
);
console.log("코드용 생성물도 갱신했어요: src/styles/tokens.generated.ts, src/app/icon.svg");
