"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  BufferGeometry,
  CanvasTexture,
  Euler,
  Group,
  LineBasicMaterial,
  LineLoop,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { intrinsicsFor, poseFromQuad, videoToScreen, type Vec3 } from "@/lib/anchor";
import type { EmotionId } from "@/lib/emotions";
import { aimFromDirection } from "@/lib/placement";
import type { ObjectKind } from "@/lib/types";
import { sceneChip } from "./chip";
import { objectTexture } from "./orbTexture";
import { screenAngle, watchOrientation, type Orientation } from "./orientation";
import { createQrTracker } from "./qrTracker";

export type SceneMemory = {
  id: string;
  emotion: EmotionId;
  /** 포스터 기준 자리 (미터) */
  anchor: Vec3;
  mine: boolean;
};

export type Aim = { yaw: number; pitch: number };

/** 포스터를 찾는 중 / 찾음 / 그림 위(가상의 포스터) */
type AnchorState = "searching" | "found" | "virtual";

const ORB_SCALE = 0.22; // 구슬 지름 약 12cm
const VIRTUAL_DISTANCE = 2.1; // 그림 위에서 가상 포스터까지 거리(m)

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** 그림 위에서 보여 줄 가상의 포스터 카드 */
function posterCardTexture(placeName: string) {
  const w = 420;
  const h = 560;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = cssVar("--palette-paper");
  ctx.strokeStyle = cssVar("--palette-ink");
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, h - 6, 24);
  ctx.fill();
  ctx.stroke();
  // QR 자리
  ctx.fillStyle = cssVar("--palette-ink");
  const q = 200;
  const qx = (w - q) / 2;
  const qy = 70;
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 9; j++) if ((i * 7 + j * 3 + i * j) % 3 !== 0) ctx.fillRect(qx + i * (q / 9), qy + j * (q / 9), q / 9 - 2, q / 9 - 2);
  for (const [fx, fy] of [
    [qx, qy],
    [qx + q - 66, qy],
    [qx, qy + q - 66],
  ]) {
    ctx.fillStyle = cssVar("--palette-paper");
    ctx.fillRect(fx, fy, 66, 66);
    ctx.strokeStyle = cssVar("--palette-ink");
    ctx.lineWidth = 10;
    ctx.strokeRect(fx + 5, fy + 5, 56, 56);
    ctx.fillStyle = cssVar("--palette-ink");
    ctx.fillRect(fx + 20, fy + 20, 26, 26);
  }
  ctx.fillStyle = cssVar("--palette-ink");
  ctx.textAlign = "center";
  ctx.font = "bold 40px serif";
  ctx.fillText(placeName.slice(0, 10), w / 2, 350);
  ctx.font = "26px sans-serif";
  ctx.fillText("여기에 마음을 남겨요", w / 2, 400);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/**
 * 장소 화면 (decisions 3-A)
 *  - 카메라: 이 장소의 QR 포스터를 찾으면, 포스터 기준으로 정해진 자리에 구슬이 뜬다.
 *    포스터가 화면에서 벗어나도 휴대폰 방향 센서로 그 자리를 유지하고, 다시 비추면 더 정확히 맞춘다.
 *  - 그림 위: 앞쪽에 가상의 포스터를 두고 같은 배치로 보여 준다. 손가락·마우스로 끌어서 둘러본다.
 *  - mode="place" 이면 이번 기억이 놓일 자리(nextSlot)에 반짝이는 구슬을 보여 준다.
 */
export default function PlaceScene({
  memories,
  objectKind,
  mode,
  ghostEmotion,
  nextSlot,
  cameraStream,
  placeSlug,
  placeName,
  anchorSize,
  aimRef,
  onSelect,
  onUsePicture,
}: {
  memories: SceneMemory[];
  objectKind: ObjectKind;
  mode: "view" | "place";
  ghostEmotion?: EmotionId;
  nextSlot?: Vec3;
  cameraStream: MediaStream | null;
  placeSlug: string;
  placeName: string;
  /** 인쇄된 QR 한 변 길이(m) */
  anchorSize: number;
  aimRef?: MutableRefObject<(() => Aim) | null>;
  onSelect?: (id: string) => void;
  onUsePicture?: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [usingSensor, setUsingSensor] = useState(false);
  const withCamera = !!cameraStream;
  const [anchorState, setAnchorState] = useState<AnchorState>(withCamera ? "searching" : "virtual");
  const [lost, setLost] = useState(false);
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
    // 카메라 영상 위에서는 실제 렌즈와 비슷한 시야, 그림 위에서는 조금 넓게
    const camera = new PerspectiveCamera(withCamera ? 62 : 75, 1, 0.05, 100);
    camera.rotation.order = "YXZ";
    scene.add(camera);

    const size = { width: 1, height: 1 };
    const resize = () => {
      size.width = mount.clientWidth;
      size.height = mount.clientHeight;
      renderer.setSize(size.width, size.height, false);
      renderer.domElement.style.width = `${size.width}px`;
      renderer.domElement.style.height = `${size.height}px`;
      camera.aspect = size.width / Math.max(size.height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // ── 포스터 기준 묶음: 모든 구슬은 이 안에서 포스터 좌표로 놓인다 ──
    const anchor = new Group();
    anchor.visible = !withCamera; // 카메라는 포스터를 찾은 뒤에 보인다
    scene.add(anchor);

    const disposables: { dispose: () => void }[] = [];
    if (withCamera) {
      // 찾은 QR 둘레 표시
      const s = anchorSize / 2 + 0.015;
      const frame = new LineLoop(
        new BufferGeometry().setFromPoints([new Vector3(-s, s, 0), new Vector3(s, s, 0), new Vector3(s, -s, 0), new Vector3(-s, -s, 0)]),
        new LineBasicMaterial({ color: cssVar("--palette-coral") }),
      );
      anchor.add(frame);
      disposables.push(frame.geometry, frame.material);
    } else {
      const tex = posterCardTexture(placeName);
      const card = new Mesh(new PlaneGeometry(0.42, 0.56), new MeshBasicMaterial({ map: tex, transparent: true }));
      card.position.set(0, -0.12, 0);
      anchor.add(card);
      disposables.push(card.geometry, card.material, tex);
    }

    const sprites = new Map<string, Sprite>();
    const syncSprites = () => {
      const list = memoriesRef.current;
      const ids = new Set(list.map((m) => m.id));
      for (const [id, s] of sprites) {
        if (!ids.has(id)) {
          anchor.remove(s);
          s.material.dispose();
          sprites.delete(id);
        }
      }
      for (const m of list) {
        if (sprites.has(m.id)) continue;
        const s = new Sprite(
          new SpriteMaterial({ map: objectTexture(objectKind, m.emotion, { mine: m.mine }), transparent: true, depthWrite: false }),
        );
        s.position.set(m.anchor.x, m.anchor.y, m.anchor.z);
        s.scale.setScalar(ORB_SCALE);
        s.userData = { id: m.id, baseY: m.anchor.y, phase: Math.random() * Math.PI * 2 };
        anchor.add(s);
        sprites.set(m.id, s);
      }
    };
    syncSprites();

    let ghost: Sprite | null = null;
    if (mode === "place" && nextSlot) {
      ghost = new Sprite(
        new SpriteMaterial({ map: objectTexture(objectKind, ghostEmotion ?? "brand", { mine: true }), transparent: true, depthWrite: false }),
      );
      ghost.position.set(nextSlot.x, nextSlot.y, nextSlot.z);
      ghost.scale.setScalar(ORB_SCALE);
      anchor.add(ghost);
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

    // ── 포스터 찾기 (카메라) ───────────────────────
    let alive = true;
    let found = false;
    let lastSeen = 0;
    const targetPos = new Vector3();
    const targetQuat = new Quaternion();
    const tmpScale = new Vector3();
    const local = new Matrix4();
    const world = new Matrix4();
    if (withCamera) {
      const tracker = createQrTracker(placeSlug);
      const loop = async () => {
        while (alive) {
          const video = videoRef.current;
          const started = performance.now();
          try {
            const corners = video ? await tracker.detect(video) : null;
            if (corners && video && alive) {
              const screenCorners = corners.map((c) =>
                videoToScreen(c, { width: video.videoWidth, height: video.videoHeight }, size),
              );
              const pose = poseFromQuad(screenCorners, anchorSize, intrinsicsFor(size.width, size.height, camera.fov));
              if (pose) {
                const { R, t } = pose;
                // 계산용 카메라 좌표(y 아래, z 앞) → Three.js 카메라 좌표(y 위, z 뒤)
                local.set(
                  R[0], R[1], R[2], t.x,
                  -R[3], -R[4], -R[5], -t.y,
                  -R[6], -R[7], -R[8], -t.z,
                  0, 0, 0, 1,
                );
                camera.updateMatrixWorld(true);
                world.multiplyMatrices(camera.matrixWorld, local);
                world.decompose(targetPos, targetQuat, tmpScale);
                if (!found) {
                  anchor.position.copy(targetPos);
                  anchor.quaternion.copy(targetQuat);
                  anchor.visible = true;
                  found = true;
                  setAnchorState("found");
                }
                lastSeen = performance.now();
                setLost(false);
              }
            }
          } catch {
            // 한 번 못 읽어도 계속 찾는다
          }
          if (found && performance.now() - lastSeen > 2000) setLost(true);
          // 너무 자주 읽지 않게 (약 8번/초)
          await new Promise((r) => setTimeout(r, Math.max(0, 120 - (performance.now() - started))));
        }
      };
      loop();
    }

    // ── 방향: 끌어서 둘러보기 (센서가 없을 때) ──────
    let dragYaw = 0; // 도
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
      if (!sensor && !withCamera) {
        dragYaw -= dx * 0.25;
        dragPitch = Math.max(-30, Math.min(45, dragPitch + dy * 0.2));
      }
    };
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (moved > 8 || mode !== "view" || !anchor.visible) return;
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects([...sprites.values()])[0];
      if (hit) onSelectRef.current?.(hit.object.userData.id as string);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);

    // 그림 위: 처음 바라보는 방향 앞쪽에 가상의 포스터를 세운다
    let virtualPlaced = false;
    const placeVirtual = () => {
      const fwd = new Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
      fwd.normalize();
      anchor.position.copy(fwd.clone().multiplyScalar(VIRTUAL_DISTANCE)).add(new Vector3(0, -0.2, 0));
      anchor.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), fwd.clone().negate());
      virtualPlaced = true;
    };

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
        camera.quaternion.slerp(target, 0.35);
      } else if (!withCamera) {
        camera.rotation.set((dragPitch * Math.PI) / 180, (-dragYaw * Math.PI) / 180, 0);
      }
      if (!withCamera && !virtualPlaced && (sensor || t > 0.6)) placeVirtual();
      // 포스터를 다시 찾으면 부드럽게 맞춘다
      if (withCamera && found) {
        anchor.position.lerp(targetPos, 0.3);
        anchor.quaternion.slerp(targetQuat, 0.3);
      }
      for (const s of sprites.values()) {
        s.position.y = s.userData.baseY + Math.sin(t * 1.2 + s.userData.phase) * 0.02;
      }
      if (ghost) ghost.scale.setScalar(ORB_SCALE * (1 + Math.sin(t * 2.4) * 0.08));
      if (sprites.size !== memoriesRef.current.length) syncSprites();
      renderer.render(scene, camera);

      // 화면 밖 마음이 어느 쪽에 있는지 (0.4초마다)
      if (mode === "view" && anchor.visible && t - lastHint > 0.4) {
        lastHint = t;
        camera.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();
        right.crossVectors(fwd, up);
        const halfH = Math.atan(Math.tan(((camera.fov / 2) * Math.PI) / 180) * camera.aspect);
        let left = 0;
        let rightCount = 0;
        for (const sp of sprites.values()) {
          sp.getWorldPosition(toObj).sub(camera.position);
          toObj.y = 0;
          toObj.normalize();
          const angle = Math.atan2(toObj.dot(right), toObj.dot(fwd));
          if (angle > halfH * 0.95) rightCount++;
          else if (angle < -halfH * 0.95) left++;
        }
        setOffscreen((prev) => (prev.left === left && prev.right === rightCount ? prev : { left, right: rightCount }));
      }
    };
    tick();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      stopSensor();
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      for (const s of sprites.values()) s.material.dispose();
      ghost?.material.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      mount.removeChild(el);
      if (aimRef) aimRef.current = null;
    };
    // 화면 모드·카메라 사용 여부가 바뀌면 새로 만든다. 기억 목록 변경은 syncSprites 가 처리한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, objectKind, ghostEmotion, aimRef, withCamera, placeSlug, anchorSize]);

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-scene-bg"
      data-testid="place-scene"
      data-sensor={usingSensor ? "on" : "off"}
      data-anchor={withCamera ? anchorState : "virtual"}
    >
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

      {withCamera && anchorState === "searching" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="size-52 rounded-[var(--radius-lg)] border-2 border-dashed border-on-scene opacity-80" />
          <p className={`text-sm text-on-scene ${sceneChip}`}>이곳의 QR 포스터를 네모 안에 비춰 주세요</p>
          {onUsePicture && (
            <button type="button" onClick={onUsePicture} className={`pointer-events-auto text-sm text-on-scene underline-offset-4 hover:underline ${sceneChip}`}>
              포스터 없이 볼게요
            </button>
          )}
        </div>
      )}
      {withCamera && anchorState === "found" && lost && (
        <p className={`pointer-events-none absolute top-28 left-1/2 -translate-x-1/2 text-xs text-on-scene ${sceneChip}`}>
          포스터를 다시 비추면 자리가 더 정확해져요
        </p>
      )}

      {mode === "view" && anchorState !== "searching" && offscreen.left > 0 && (
        <span className={`pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-on-scene ${sceneChip}`} data-testid="hint-left">
          ← {offscreen.left}
        </span>
      )}
      {mode === "view" && anchorState !== "searching" && offscreen.right > 0 && (
        <span className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-on-scene ${sceneChip}`} data-testid="hint-right">
          {offscreen.right} →
        </span>
      )}
    </div>
  );
}
