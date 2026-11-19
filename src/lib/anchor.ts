/**
 * 포스터(QR) 기준 고정 (decisions 3-A)
 *
 * 1) 자리: 장소마다 n 번째 기억에 포스터 주변의 n 번째 자리를 준다 (해바라기 씨앗 배열).
 *    서버의 public.anchor_slot_position 과 같은 식이다 → tests/db 가 둘을 비교한다.
 * 2) 자세: 카메라 화면에서 찾은 QR 네 꼭짓점으로 "카메라에서 본 포스터의 위치·방향"을 계산한다.
 *
 * 포스터 좌표계(미터): 원점 = QR 한가운데, x = 오른쪽, y = 위, z = 포스터 앞(보는 사람 쪽)
 * 카메라 좌표계(계산용): x = 오른쪽, y = 아래, z = 앞 (화면 픽셀과 같은 방향)
 */

export type Vec3 = { x: number; y: number; z: number };
export type Point = { x: number; y: number };

const GOLDEN_ANGLE = 2.39996323;
const PHI_FRAC = 0.6180339887;

/** n 번째 자리 (0부터) */
export function anchorSlot(n: number): Vec3 {
  const r = 0.15 * Math.sqrt(n + 3); // n=0 에서도 QR 에서 25cm 이상 떨어지게
  const a = n * GOLDEN_ANGLE;
  const frac = n * PHI_FRAC - Math.floor(n * PHI_FRAC);
  return {
    x: r * Math.cos(a),
    y: r * Math.sin(a) * 0.8, // 위아래는 조금 납작하게
    z: 0.05 + frac * 0.3, // 포스터 바로 앞 (가까이서 비춰도 카메라 뒤로 가지 않게)
  };
}

// ── 호모그래피와 자세 ─────────────────────────────

/** 4쌍 이상의 점으로 3×3 호모그래피(행 우선, h33 = 1)를 구한다. 풀 수 없으면 null */
export function homography(src: Point[], dst: Point[]): number[] | null {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve(A, b);
  return h ? [...h, 1] : null;
}

/** 가우스 소거 (부분 피벗) */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

export type Intrinsics = { f: number; cx: number; cy: number };

/**
 * 포스터 자세. R(3×3, 행 우선)·t 는 포스터 좌표 → 카메라 좌표(x 오른쪽, y 아래, z 앞).
 */
export type Pose = { R: number[]; t: Vec3 };

/** QR 의 한 변 길이(미터) 기준, 포스터 좌표계에서의 네 꼭짓점: 왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래 */
export function qrCorners(size: number): Point[] {
  const s = size / 2;
  return [
    { x: -s, y: s },
    { x: s, y: s },
    { x: s, y: -s },
    { x: -s, y: -s },
  ];
}

/**
 * 화면에서 찾은 QR 꼭짓점(왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래 · 픽셀)으로 포스터 자세를 구한다.
 * 카메라 초점거리는 화면 시야각으로 가정한다. 가정이 조금 틀려도 같은 값으로 그리므로 화면 위 정렬은 맞는다.
 */
export function poseFromQuad(image: Point[], size: number, k: Intrinsics): Pose | null {
  const H = homography(qrCorners(size), image);
  if (!H) return null;
  // K⁻¹·H 의 열
  const col = (i: number): Vec3 => ({
    x: (H[i] - k.cx * H[6 + i]) / k.f,
    y: (H[3 + i] - k.cy * H[6 + i]) / k.f,
    z: H[6 + i],
  });
  const a1 = col(0);
  const a2 = col(1);
  const a3 = col(2);
  let lambda = 2 / (norm(a1) + norm(a2));
  if (a3.z * lambda < 0) lambda = -lambda; // 포스터는 카메라 앞에 있어야 한다
  const r1 = normalize(scale(a1, lambda));
  let r2 = scale(a2, lambda);
  r2 = normalize(sub(r2, scale(r1, dot(r1, r2)))); // 직교화
  const r3 = cross(r1, r2);
  const t = scale(a3, lambda);
  if (!Number.isFinite(t.z) || t.z <= 0) return null;
  return {
    // 열이 r1, r2, r3 인 행렬을 행 우선으로
    R: [r1.x, r2.x, r3.x, r1.y, r2.y, r3.y, r1.z, r2.z, r3.z],
    t,
  };
}

/** 포스터 좌표의 점을 카메라 좌표 → 화면 픽셀로 (테스트·디버그용) */
export function project(p: Vec3, pose: Pose, k: Intrinsics): Point {
  const { R, t } = pose;
  const x = R[0] * p.x + R[1] * p.y + R[2] * p.z + t.x;
  const y = R[3] * p.x + R[4] * p.y + R[5] * p.z + t.y;
  const z = R[6] * p.x + R[7] * p.y + R[8] * p.z + t.z;
  return { x: (k.f * x) / z + k.cx, y: (k.f * y) / z + k.cy };
}

/** 화면 시야각(세로, 도)과 크기로 초점거리 */
export function intrinsicsFor(width: number, height: number, fovDeg: number): Intrinsics {
  return { f: height / 2 / Math.tan((fovDeg * Math.PI) / 360), cx: width / 2, cy: height / 2 };
}

/**
 * 카메라 영상 픽셀 → 화면 픽셀. 영상은 화면을 꽉 채우도록(object-fit: cover) 잘려서 보인다.
 */
export function videoToScreen(p: Point, video: { width: number; height: number }, screen: { width: number; height: number }): Point {
  const s = Math.max(screen.width / video.width, screen.height / video.height);
  return {
    x: p.x * s + (screen.width - video.width * s) / 2,
    y: p.y * s + (screen.height - video.height * s) / 2,
  };
}

/** QR 내용이 이 장소의 주소인지 (다른 QR 로 고정되지 않게) */
export function isPlaceQr(text: string, slug: string) {
  try {
    const url = new URL(text);
    return url.pathname.replace(/\/+$/, "") === `/p/${slug}`;
  } catch {
    return false;
  }
}

// ── 작은 벡터 도구 ───────────────────────────────
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a: Vec3) => Math.sqrt(dot(a, a));
const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const normalize = (a: Vec3) => scale(a, 1 / norm(a));
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
