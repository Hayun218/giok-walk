"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestMotionPermission } from "./orientation";

export type CameraChoice = "undecided" | "camera" | "picture";

/**
 * 카메라는 쓰는 순간에, 이유를 말한 뒤에 켠다 (decisions: 권한 원칙).
 * 영상은 화면에만 비추고 저장하거나 보내지 않는다.
 */
export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [choice, setChoice] = useState<CameraChoice>("undecided");
  const [denied, setDenied] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    // iOS: 방향 센서 권한도 같은 터치 안에서 묻는다
    const motion = requestMotionPermission();
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = s;
      setStream(s);
      setChoice("camera");
    } catch {
      setDenied(true);
      setChoice("picture");
    }
    await motion;
  }, []);

  const usePicture = useCallback(async () => {
    // 카메라를 켜 둔 채 그림으로 바꾸면 카메라는 끈다
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    await requestMotionPermission();
    setChoice("picture");
  }, []);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  return { stream, choice, denied, start, usePicture };
}
