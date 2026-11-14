import { describe, expect, it } from "vitest";
import { aimFromDirection, alphaFromCompass, pickDistance, toPosition } from "@/lib/placement";

describe("장소 단위 배치", () => {
  it("북쪽은 -Z, 동쪽은 +X", () => {
    const north = toPosition(0, 0, 1);
    expect(north.z).toBeCloseTo(-1);
    const east = toPosition(90, 0, 1);
    expect(east.x).toBeCloseTo(1);
  });

  it("놓은 방향을 다시 읽으면 같은 자리다 (재방문 때 그대로)", () => {
    for (const [yaw, pitch] of [[0, 0], [45, 10], [200, -20], [359, 55]]) {
      const p = toPosition(yaw, pitch, 3);
      const aim = aimFromDirection(p.x, p.y, p.z);
      expect(aim.yaw).toBeCloseTo(yaw, 3);
      expect(aim.pitch).toBeCloseTo(pitch, 3);
    }
  });

  it("너무 위나 아래를 보면 높이를 제한한다", () => {
    expect(aimFromDirection(0, 1, 0).pitch).toBe(60);
    expect(aimFromDirection(0, -1, 0).pitch).toBe(-30);
  });

  it("나침반 방향을 alpha 로 바꾼다", () => {
    expect(alphaFromCompass(0)).toBe(0);
    expect(alphaFromCompass(90)).toBe(270);
  });

  it("거리는 DB 제약(1~10m) 안에 있다", () => {
    expect(pickDistance(() => 0)).toBeGreaterThanOrEqual(1);
    expect(pickDistance(() => 0.9999)).toBeLessThanOrEqual(10);
  });
});
