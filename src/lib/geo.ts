/**
 * 현장 확인 (decisions 3-B)
 * 방문객 위치는 이 휴대폰 안에서만 쓴다. 서버로 보내거나 저장하지 않는다.
 * 장소 좌표(공개 정보)와 비교해 거리·방향만 계산한다.
 */
export type LatLng = { lat: number; lng: number };
export type Fix = LatLng & { accuracy: number };

const R = 6_371_000; // 지구 반지름(m)
const rad = (d: number) => (d * Math.PI) / 180;

/** 두 지점 사이 거리(m) */
export function distanceM(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** a 에서 b 를 바라보는 방향 (북쪽 0°, 시계 방향) */
export function bearingDeg(a: LatLng, b: LatLng) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * 반경 안인가. 휴대폰 위치는 오차(accuracy)가 있으므로 오차만큼은 너그럽게 본다.
 * 다만 오차가 너무 크면(실내 등) 최대 100m 까지만 봐준다.
 */
export function isWithin(fix: Fix, place: LatLng, radiusM: number) {
  return distanceM(fix, place) - Math.min(fix.accuracy, 100) <= radiusM;
}

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.max(1, Math.round(m / 10) * 10)}m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)}km`;
}

type Coords = { lat: number | null; lng: number | null };
export function placeLatLng(p: Coords): LatLng | null {
  return p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null;
}
