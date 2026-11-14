import { CanvasTexture, SRGBColorSpace } from "three";
import type { EmotionId } from "@/lib/emotions";
import type { ObjectKind } from "@/lib/types";

/** CSS 변수에서 지금 색을 읽는다 → 컬러 시스템이 바뀌어도 3D 화면이 따라간다 */
function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** 토큰 hex(#rrggbb) 에 투명도를 붙인다 */
function withAlpha(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `#${full}${a}`;
}

const cache = new Map<string, CanvasTexture>();

export function objectTexture(kind: ObjectKind, emotion: EmotionId | "brand", options: { mine?: boolean; ghost?: boolean } = {}) {
  const key = `${kind}:${emotion}:${options.mine ? 1 : 0}:${options.ghost ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const from = cssVar(`--orb-${emotion}-from`);
  const to = cssVar(`--orb-${emotion}-to`);
  const ink = cssVar("--palette-ink");
  const paper = cssVar("--palette-paper");
  const c = size / 2;

  // 은은한 빛
  const glow = ctx.createRadialGradient(c, c, size * 0.2, c, c, size * 0.5);
  glow.addColorStop(0, withAlpha(to, 0.45));
  glow.addColorStop(1, withAlpha(to, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  const grad = ctx.createLinearGradient(c - 70, c - 70, c + 70, c + 70);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);

  if (kind === "envelope") {
    const w = 150;
    const h = 100;
    const x = c - w / 2;
    const y = c - h / 2;
    ctx.fillStyle = paper;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 6);
    ctx.lineTo(c, y + h * 0.58);
    ctx.lineTo(x + w - 4, y + 6);
    ctx.stroke();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c, y + h * 0.58, 18, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const r = 70;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(c - r * 0.35, c - r * 0.4, r * 0.3, r * 0.17, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (options.mine) {
    ctx.strokeStyle = paper;
    ctx.lineWidth = 6;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.arc(c, c, 100, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}
