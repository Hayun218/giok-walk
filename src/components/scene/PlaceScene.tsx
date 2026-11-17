"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  Euler,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import type { EmotionId } from "@/lib/emotions";
import { aimFromDirection, toPosition } from "@/lib/placement";
import type { ObjectKind } from "@/lib/types";
import { objectTexture } from "./orbTexture";
import { sceneChip } from "./chip";
import { screenAngle, watchOrientation, type Orientation } from "./orientation";

export type SceneMemory = {
  id: string;
  emotion: EmotionId;
  yaw: number;
  pitch: number;
  distance: number;
  mine: boolean;
};

export type Aim = { yaw: number; pitch: number };

/**
 * 장소 화면 (카메라 위 또는 그림 위)
 *  - 기기 방향 센서가 있으면 휴대폰을 돌려 둘러본다
 *  - 없으면(컴퓨터, 권한 거부) 손가락·마우스로 끌어서 둘러본다
 *  - mode="place" 이면 가운데에 놓을 오브젝트가 떠 있고, aimRef.current() 로 지금 방향을 읽는다
 */
export default function PlaceScene({
  memories,
  objectKind,
  mode,
  ghostEmotion,
  cameraStream,
  aimRef,
  onSelect,
  initialYaw = 0,
}: {
  memories: SceneMemory[];
  objectKind: ObjectKind;
  mode: "view" | "place";
  ghostEmotion?: EmotionId;
  cameraStream: MediaStream | null;
  aimRef?: MutableRefObject<(() => Aim) | null>;
  onSelect?: (id: string) => void;
  /** 끌어서 볼 때 처음 바라볼 방향 (예: 내가 마지막에 남긴 마음) */
  initialYaw?: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [usingSensor, setUsingSensor] = useState(false);
  const wide = !cameraStream;
  const [offscreen, setOffscreen] = useState({ left: 0, right: 0 });
  const memoriesRef = useRef(memories);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    memoriesRef.current = memories;
    onSelectRef.current = onSelect;
  }, [memories, onSelect]);

  // 카메라 영상
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = cameraStream;
    if (cameraStream) video.play().catch(() => {});
  }, [cameraStream]);

  useEffect(() => {
    const mount = mountRef.current!;
    const renderer = new WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new Scene();
    // 카메라 영상 위에서는 실제 렌즈와 비슷한 시야, 그림 위에서는 더 넓게 (한 화면에 여러 마음이 보이게)
    const camera = new PerspectiveCamera(wide ? 85 : 65, 1, 0.1, 100);
    camera.rotation.order = "YXZ";

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // ── 오브젝트 ───────────────────────────────
    const sprites = new Map<string, Sprite>();
    const syncSprites = () => {
      const list = memoriesRef.current;
      const ids = new Set(list.map((m) => m.id));
      for (const [id, s] of sprites) {
        if (!ids.has(id)) {
          scene.remove(s);
          s.material.dispose();
          sprites.delete(id);
        }
      }
      for (const m of list) {
        if (sprites.has(m.id)) continue;
        const s = new Sprite(
          new SpriteMaterial({ map: objectTexture(objectKind, m.emotion, { mine: m.mine }), transparent: true, depthWrite: false }),
        );
        const p = toPosition(m.yaw, m.pitch, m.distance);
        s.position.set(p.x, p.y, p.z);
        s.scale.setScalar(0.9);
        s.userData = { id: m.id, baseY: p.y, phase: Math.random() * Math.PI * 2 };
        scene.add(s);
        sprites.set(m.id, s);
      }
    };
    syncSprites();

    let ghost: Sprite | null = null;
    if (mode === "place") {
      ghost = new Sprite(
        new SpriteMaterial({ map: objectTexture(objectKind, ghostEmotion ?? "brand"), transparent: true, depthWrite: false }),
      );
      ghost.position.set(0, 0, -2.2);
      ghost.scale.setScalar(0.75);
      camera.add(ghost);
      scene.add(camera);
    }

    if (aimRef) {
      aimRef.current = () => {
        const dir = new Vector3();
        camera.getWorldDirection(dir);
        return aimFromDirection(dir.x, dir.y, dir.z);
      };
    }

    // ── 방향: 센서 ─────────────────────────────
    const zee = new Vector3(0, 0, 1);
    const euler = new Euler();
    const q0 = new Quaternion();
    const q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // 카메라가 화면 뒤쪽을 보게
    const target = new Quaternion();
    let sensor: Orientation | null = null;
    const stopSensor = watchOrientation((o) => {
      sensor = o;
      setUsingSensor(true);
    });

    // ── 방향: 끌어서 둘러보기 (센서가 없을 때) ──────
    let dragYaw = initialYaw; // 도
    let dragPitch = 0;
    let dragging = false;
    let moved = 0;
    let last = { x: 0, y: 0 };
    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      last = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      moved += Math.abs(dx) + Math.abs(dy);
      last = { x: e.clientX, y: e.clientY };
      if (!sensor) {
        dragYaw -= dx * 0.25;
        dragPitch = Math.max(-30, Math.min(60, dragPitch + dy * 0.2));
      }
    };
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (moved > 8 || mode !== "view") return;
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects([...sprites.values()])[0];
      if (hit) onSelectRef.current?.(hit.object.userData.id as string);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);

    // ── 그리기 ─────────────────────────────────
    let raf = 0;
    let lastHint = 0;
    const start = performance.now();
    const fwd = new Vector3();
    const toObj = new Vector3();
    const up = new Vector3(0, 1, 0);
    const right = new Vector3();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = (performance.now() - start) / 1000;
      if (sensor) {
        const d = Math.PI / 180;
        euler.set(sensor.beta * d, sensor.alpha * d, -sensor.gamma * d, "YXZ");
        target.setFromEuler(euler);
        target.multiply(q1);
        target.multiply(q0.setFromAxisAngle(zee, -screenAngle() * d));
        camera.quaternion.slerp(target, 0.25); // 나침반 떨림 줄이기
      } else {
        camera.rotation.set((dragPitch * Math.PI) / 180, (-dragYaw * Math.PI) / 180, 0);
      }
      for (const s of sprites.values()) {
        s.position.y = s.userData.baseY + Math.sin(t * 1.2 + s.userData.phase) * 0.05;
      }
      if (ghost) ghost.scale.setScalar(0.75 + Math.sin(t * 2.4) * 0.04);
      if (sprites.size !== memoriesRef.current.length) syncSprites();
      renderer.render(scene, camera);

      // 화면 밖 마음이 어느 쪽에 있는지 (0.4초마다)
      if (mode === "view" && t - lastHint > 0.4) {
        lastHint = t;
        camera.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();
        right.crossVectors(fwd, up);
        const halfH = Math.atan(Math.tan(((camera.fov / 2) * Math.PI) / 180) * camera.aspect);
        let left = 0;
        let rightCount = 0;
        for (const sp of sprites.values()) {
          toObj.copy(sp.position);
          toObj.y = 0;
          toObj.normalize();
          const angle = Math.atan2(toObj.dot(right), toObj.dot(fwd));
          if (angle > halfH * 0.9) rightCount++;
          else if (angle < -halfH * 0.9) left++;
        }
        setOffscreen((prev) => (prev.left === left && prev.right === rightCount ? prev : { left, right: rightCount }));
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      stopSensor();
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      for (const s of sprites.values()) s.material.dispose();
      ghost?.material.dispose();
      renderer.dispose();
      mount.removeChild(el);
      if (aimRef) aimRef.current = null;
    };
    // 화면 모드·오브젝트 종류가 바뀌면 새로 만든다. 기억 목록 변경은 syncSprites 가 처리한다.
    // initialYaw 는 처음 한 번만 쓴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, objectKind, ghostEmotion, aimRef, wide]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-scene-bg" data-testid="place-scene" data-sensor={usingSensor ? "on" : "off"}>
      {cameraStream ? (
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline autoPlay />
      ) : (
        // 카메라 없이 볼 때의 배경: 하늘과 수평선 (라이트·다크 모두 토큰 값)
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, var(--color-scene-bg) 0%, var(--color-scene-sky) 55%, var(--color-scene-ground) 56%, var(--color-scene-bg) 100%)",
          }}
        />
      )}
      <div ref={mountRef} className="absolute inset-0" />
      {mode === "view" && offscreen.left > 0 && (
        <span className={`pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-on-scene ${sceneChip}`} data-testid="hint-left">
          ← {offscreen.left}
        </span>
      )}
      {mode === "view" && offscreen.right > 0 && (
        <span className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-on-scene ${sceneChip}`} data-testid="hint-right">
          {offscreen.right} →
        </span>
      )}
    </div>
  );
}
