import { afterAll, describe, expect, it } from "vitest";
import { anchorSlot } from "@/lib/anchor";
import { admin, anonymousVisitor, cleanupTestPlaces, createPlace, sampleMemory } from "./helpers";

afterAll(cleanupTestPlaces);

describe("포스터 기준 자리 배정 (서버)", () => {
  it("서버의 자리 식과 앱의 자리 식이 같다", async () => {
    for (const n of [0, 1, 2, 7, 23, 99]) {
      const { data, error } = await admin.rpc("anchor_slot_position", { n });
      expect(error).toBeNull();
      const row = Array.isArray(data) ? data[0] : data;
      const ts = anchorSlot(n);
      expect(row.x).toBeCloseTo(ts.x, 4);
      expect(row.y).toBeCloseTo(ts.y, 4);
      expect(row.z).toBeCloseTo(ts.z, 4);
    }
  });

  it("여러 사람이 동시에 남겨도 자리가 겹치지 않는다", async () => {
    const place = await createPlace("open");
    const visitors = await Promise.all(Array.from({ length: 8 }, () => anonymousVisitor()));
    const results = await Promise.all(
      visitors.map((v, i) =>
        v.client.from("memories").insert(sampleMemory(place.id, { letter: `동시에 ${i}` })).select("anchor_slot").single(),
      ),
    );
    const slots = results.map((r) => r.data!.anchor_slot).sort((a, b) => a! - b!);
    expect(slots).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("방문객이 자리를 정하거나 바꿀 수 없다", async () => {
    const place = await createPlace("open");
    const me = await anonymousVisitor();
    const { data } = await me.client
      .from("memories")
      .insert(sampleMemory(place.id, { anchor_slot: 99, anchor_x: 5, anchor_y: 5, anchor_z: 5 }))
      .select("id, anchor_slot, anchor_x")
      .single();
    expect(data!.anchor_slot).toBe(0);
    expect(data!.anchor_x).toBeCloseTo(anchorSlot(0).x, 4);
    const { error } = await me.client.from("memories").update({ anchor_x: 9 }).eq("id", data!.id);
    expect(error).not.toBeNull();
  });
});
