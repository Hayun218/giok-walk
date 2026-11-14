/**
 * 기기 방향 센서. iOS 는 사용자 터치 안에서 권한을 받아야 한다.
 * 나침반 값을 쓸 수 있으면 북쪽 기준(절대 방향)으로 맞춘다 → 다시 와도 같은 방향에 기억이 있다.
 */
import { alphaFromCompass } from "@/lib/placement";

type IOSOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export async function requestMotionPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return false;
  const ctor = DeviceOrientationEvent as IOSOrientationEvent;
  if (typeof ctor.requestPermission === "function") {
    try {
      return (await ctor.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return true; // 안드로이드 등은 따로 묻지 않는다
}

export type Orientation = { alpha: number; beta: number; gamma: number; absolute: boolean };

/** 방향 값을 구독한다. 반환값은 구독 해제 함수 */
export function watchOrientation(onChange: (o: Orientation) => void): () => void {
  const handleAbsolute = (e: DeviceOrientationEvent) => {
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    onChange({ alpha: e.alpha, beta: e.beta, gamma: e.gamma, absolute: true });
  };
  let sawAbsolute = false;
  const handle = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    const heading = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
    if (typeof heading === "number" && !Number.isNaN(heading)) {
      onChange({ alpha: alphaFromCompass(heading), beta: e.beta, gamma: e.gamma, absolute: true });
    } else if (!sawAbsolute && e.alpha != null) {
      onChange({ alpha: e.alpha, beta: e.beta, gamma: e.gamma, absolute: e.absolute });
    }
  };
  const abs = (e: Event) => {
    sawAbsolute = true;
    handleAbsolute(e as DeviceOrientationEvent);
  };
  window.addEventListener("deviceorientationabsolute", abs);
  window.addEventListener("deviceorientation", handle);
  return () => {
    window.removeEventListener("deviceorientationabsolute", abs);
    window.removeEventListener("deviceorientation", handle);
  };
}

export function screenAngle() {
  if (typeof window === "undefined") return 0;
  return screen.orientation?.angle ?? 0;
}
