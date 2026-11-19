import { describe, expect, it } from "vitest";
import { bearingDeg, distanceM, formatDistance, isWithin } from "@/lib/geo";

const cityHall = { lat: 37.5665, lng: 126.978 };

describe("현장 확인 계산 (휴대폰 안에서만)", () => {
  it("거리: 위도 0.001° ≈ 111m", () => {
    expect(distanceM(cityHall, { lat: 37.5675, lng: 126.978 })).toBeCloseTo(111, 0);
  });

  it("방향: 북쪽 0°, 동쪽 90°", () => {
    expect(bearingDeg(cityHall, { lat: 37.6, lng: 126.978 })).toBeCloseTo(0, 1);
    expect(bearingDeg(cityHall, { lat: 37.5665, lng: 127.0 })).toBeCloseTo(90, 0);
  });

  it("반경 안: 위치 오차만큼은 너그럽게, 단 100m 까지만", () => {
    const near = { lat: 37.5674, lng: 126.978, accuracy: 10 }; // 약 100m
    expect(isWithin(near, cityHall, 100)).toBe(true);
    const far = { lat: 37.5695, lng: 126.978, accuracy: 30 }; // 약 333m
    expect(isWithin(far, cityHall, 100)).toBe(false);
    const fuzzy = { lat: 37.5695, lng: 126.978, accuracy: 5000 }; // 오차가 커도 100m 까지만 봐준다
    expect(isWithin(fuzzy, cityHall, 100)).toBe(false);
  });

  it("거리 표시", () => {
    expect(formatDistance(123)).toBe("120m");
    expect(formatDistance(1234)).toBe("1.2km");
    expect(formatDistance(23_456)).toBe("23km");
  });
});
