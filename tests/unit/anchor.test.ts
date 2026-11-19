import { describe, expect, it } from "vitest";
import {
  anchorSlot,
  intrinsicsFor,
  isPlaceQr,
  poseFromQuad,
  project,
  qrCorners,
  videoToScreen,
  type Pose,
} from "@/lib/anchor";

describe("포스터 주변 자리 (겹치지 않게)", () => {
  it("100명이 남겨도 구슬(지름 12cm)끼리 20cm 이상 떨어져 있다", () => {
    const slots = Array.from({ length: 100 }, (_, i) => anchorSlot(i));
    let min = Infinity;
    for (let i = 0; i < slots.length; i++)
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i];
        const b = slots[j];
        min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
      }
    expect(min).toBeGreaterThanOrEqual(0.2);
  });

  it("QR 둘레 20cm 는 비워 둔다 (포스터가 가려지지 않게)", () => {
    for (let i = 0; i < 100; i++) {
      const s = anchorSlot(i);
      expect(Math.hypot(s.x, s.y)).toBeGreaterThanOrEqual(0.2);
    }
  });

  it("처음 20개는 포스터 둘레(좌우 70cm, 포스터 앞 5~35cm)에 모인다", () => {
    for (let i = 0; i < 20; i++) {
      const s = anchorSlot(i);
      expect(Math.abs(s.x)).toBeLessThan(0.7);
      expect(s.z).toBeGreaterThanOrEqual(0.05);
      expect(s.z).toBeLessThanOrEqual(0.35);
    }
  });
});

/** 포스터 좌표 → 카메라 좌표 회전: y축으로 yaw, x축으로 pitch */
function makePose(yawDeg: number, pitchDeg: number, t: { x: number; y: number; z: number }): Pose {
  const y = (yawDeg * Math.PI) / 180;
  const p = (pitchDeg * Math.PI) / 180;
  // 정면(포스터 y 위 → 카메라 y 아래, 포스터 z 앞 → 카메라 -z)
  const F = [1, 0, 0, 0, -1, 0, 0, 0, -1];
  const Ry = [Math.cos(y), 0, Math.sin(y), 0, 1, 0, -Math.sin(y), 0, Math.cos(y)];
  const Rx = [1, 0, 0, 0, Math.cos(p), -Math.sin(p), 0, Math.sin(p), Math.cos(p)];
  const mul = (a: number[], b: number[]) =>
    Array.from({ length: 9 }, (_, i) => {
      const r = Math.floor(i / 3);
      const c = i % 3;
      return a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    });
  return { R: mul(F, mul(Rx, Ry)), t };
}

describe("QR 네 꼭짓점으로 포스터 자세 구하기", () => {
  const k = intrinsicsFor(390, 844, 65);
  const size = 0.2;

  it.each([
    [0, 0, { x: 0, y: 0, z: 1.2 }],
    [25, 0, { x: 0.15, y: -0.1, z: 1.5 }],
    [-35, 15, { x: -0.2, y: 0.2, z: 2.0 }],
    [10, -20, { x: 0.05, y: 0.3, z: 0.8 }],
  ])("yaw %d°, pitch %d° 에서 찍은 QR 로 자세를 되찾는다", (yaw, pitch, t) => {
    const truth = makePose(yaw, pitch, t);
    const image = qrCorners(size).map((c) => project({ x: c.x, y: c.y, z: 0 }, truth, k));
    const pose = poseFromQuad(image, size, k)!;
    expect(pose).not.toBeNull();
    expect(pose.t.x).toBeCloseTo(t.x, 3);
    expect(pose.t.y).toBeCloseTo(t.y, 3);
    expect(pose.t.z).toBeCloseTo(t.z, 3);
    // 포스터 앞 50cm 에 띄운 구슬도 같은 화면 자리에 그려진다
    const orb = { x: 0.3, y: 0.4, z: 0.5 };
    const a = project(orb, truth, k);
    const b = project(orb, pose, k);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.5);
  });

  it("꼭짓점이 한 줄로 찍히는 등 풀 수 없으면 null", () => {
    const flat = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    expect(poseFromQuad(flat, size, k)).toBeNull();
  });
});

describe("카메라 영상 → 화면 좌표 (꽉 채우기로 잘린 영상)", () => {
  it("가운데는 가운데로", () => {
    const p = videoToScreen({ x: 320, y: 240 }, { width: 640, height: 480 }, { width: 390, height: 844 });
    expect(p.x).toBeCloseTo(195);
    expect(p.y).toBeCloseTo(422);
  });
});

describe("이 장소의 QR 인지", () => {
  it("주소의 장소가 같아야 한다", () => {
    expect(isPlaceQr("https://giok-walk.vercel.app/p/demo", "demo")).toBe(true);
    expect(isPlaceQr("https://giok-walk.vercel.app/p/demo/", "demo")).toBe(true);
    expect(isPlaceQr("https://giok-walk.vercel.app/p/other", "demo")).toBe(false);
    expect(isPlaceQr("아무 글자", "demo")).toBe(false);
  });
});
