"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Fix } from "@/lib/geo";

export type LocationState =
  | { status: "idle" } // 아직 묻지 않음
  | { status: "asking" }
  | { status: "ok"; fix: Fix }
  | { status: "denied" }
  | { status: "unavailable" };

/**
 * 휴대폰 위치. 방문객이 버튼을 눌렀을 때만 묻는다.
 * 이미 허락한 적이 있으면(브라우저가 기억) 화면을 열 때 바로 이어서 쓴다.
 * 위치는 이 화면의 메모리에만 있고 어디에도 보내거나 저장하지 않는다.
 */
export function useLocation() {
  const [state, setState] = useState<LocationState>({ status: "idle" });
  const watchId = useRef<number | null>(null);

  const start = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "unavailable" });
      return;
    }
    setState((s) => (s.status === "ok" ? s : { status: "asking" }));
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      (p) => setState({ status: "ok", fix: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy } }),
      (err) => setState({ status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
  }, []);

  // 이미 허락했다면 묻지 않고 바로 시작
  useEffect(() => {
    let cancelled = false;
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (!cancelled && p.state === "granted") start();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [start]);

  return { state, start };
}
