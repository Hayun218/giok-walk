/**
 * 장소 단위 배치 (decisions 3)
 * 방문객을 둘러싼 가상의 구 위에 기억을 놓는다.
 *  - yaw: 북쪽 기준 시계 방향 각도(도). 0 = 북, 90 = 동
 *  - pitch: 수평선 기준 높이(도). 위가 +
 *  - distance: 미터
 * 3D 좌표: 북 = -Z, 동 = +X, 위 = +Y (Three.js 카메라 기본 방향이 -Z)
 * ARKit 의 gravityAndHeading 정렬(북 = -Z)과 같은 규칙이라 네이티브 앱에서도 같은 배치를 재현할 수 있다.
 */
export const PITCH_MIN = -30;
export const PITCH_MAX = 60;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function toPosition(yaw: number, pitch: number, distance: number) {
  const y = rad(yaw);
  const p = rad(pitch);
  return {
    x: Math.sin(y) * Math.cos(p) * distance,
    y: Math.sin(p) * distance,
    z: -Math.cos(y) * Math.cos(p) * distance,
  };
}

export function clampPitch(pitch: number) {
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch));
}

export function normalizeYaw(yaw: number) {
  return ((yaw % 360) + 360) % 360;
}

/** 카메라가 바라보는 방향(단위 벡터) → 놓을 자리 */
export function aimFromDirection(x: number, y: number, z: number) {
  const len = Math.hypot(x, y, z) || 1;
  return {
    yaw: normalizeYaw(deg(Math.atan2(x / len, -z / len))),
    pitch: clampPitch(deg(Math.asin(y / len))),
  };
}

/** iOS webkitCompassHeading(시계 방향) → deviceorientation alpha(반시계 방향) */
export function alphaFromCompass(heading: number) {
  return normalizeYaw(360 - heading);
}

/** 새 기억의 거리: 너무 겹치지 않게 조금씩 다르게 */
export function pickDistance(random = Math.random) {
  return Math.round((2.4 + random() * 2.2) * 10) / 10;
}
