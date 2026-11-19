import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import QRCode from "qrcode";

/**
 * 가짜 카메라 영상: 흰 벽에 붙은 QR 포스터를 정면에서 찍은 640×480 화면 (Y4M).
 * 크롬의 --use-file-for-fake-video-capture 로 넣으면 카메라 대신 이 영상이 나온다.
 */
export function ensureQrVideo(path: string, text: string) {
  if (existsSync(path)) return path;
  const W = 640;
  const H = 480;
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = Math.max(2, Math.floor(100 / n)); // 1m 쯤 떨어져서 본 크기
  const side = cell * n;
  const x0 = Math.floor((W - side) / 2);
  const y0 = Math.floor((H - side) / 2);
  const Y = Buffer.alloc(W * H, 235); // 흰 벽
  // 포스터 종이(조금 더 큰 흰 사각형 + 테두리)
  for (let y = y0 - 40; y < y0 + side + 90; y++)
    for (let x = x0 - 40; x < x0 + side + 40; x++) {
      const edge = y === y0 - 40 || y === y0 + side + 89 || x === x0 - 40 || x === x0 + side + 39;
      Y[y * W + x] = edge ? 120 : 250;
    }
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.modules.get(r, c))
        for (let dy = 0; dy < cell; dy++) Y.fill(20, (y0 + r * cell + dy) * W + x0 + c * cell, (y0 + r * cell + dy) * W + x0 + (c + 1) * cell);
  const UV = Buffer.alloc((W / 2) * (H / 2) * 2, 128);
  const frame = Buffer.concat([Buffer.from("FRAME\n"), Y, UV]);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F15:1 Ip A1:1 C420jpeg\n`), frame, frame]));
  return path;
}
