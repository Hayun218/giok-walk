"use client";

import { isPlaceQr, type Point } from "@/lib/anchor";

type Reader = typeof import("zxing-wasm/reader");
let readerPromise: Promise<Reader> | null = null;

/** QR 읽기 엔진은 장소 화면에서 카메라를 켤 때만 불러온다 */
function loadReader(): Promise<Reader> {
  readerPromise ??= import("zxing-wasm/reader").then((z) => {
    z.prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? "/wasm/zxing_reader.wasm" : prefix + path),
      },
      fireImmediately: true,
    });
    return z;
  });
  return readerPromise;
}

/**
 * 카메라 영상에서 이 장소의 QR 을 찾아 네 꼭짓점(영상 픽셀)을 돌려준다.
 * 순서: 왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래 (QR 자체의 방향 기준)
 */
export function createQrTracker(slug: string) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const MAX_SIDE = 720;

  return {
    async detect(video: HTMLVideoElement): Promise<Point[] | null> {
      if (video.readyState < 2 || !video.videoWidth) return null;
      const reader = await loadReader();
      const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const results = await reader.readBarcodes(image, { formats: ["QRCode"], tryHarder: true, maxNumberOfSymbols: 4 });
      const hit = results.find((r) => r.isValid && isPlaceQr(r.text, slug));
      if (!hit) return null;
      const p = hit.position;
      return [p.topLeft, p.topRight, p.bottomRight, p.bottomLeft].map((c) => ({ x: c.x / scale, y: c.y / scale }));
    },
  };
}
