import { afterAll, describe, expect, it } from "vitest";
import { admin, anonymousVisitor, cleanupTestPlaces, createPlace, guest, operator, sampleMemory } from "./helpers";

afterAll(cleanupTestPlaces);

describe("핵심 흐름: QR 진입 → 기록 → 남기기 → 다시 보기 (DB 규칙)", () => {
  it("익명 방문객이 운영 중인 장소에 기록을 남기고, 다시 들어와도 자기 기록을 본다", async () => {
    const place = await createPlace("open");
    const me = await anonymousVisitor();

    const { data: created, error } = await me.client
      .from("memories")
      .insert(sampleMemory(place.id, { visibility: "private" }))
      .select("id, author_id, status, yaw")
      .single();
    expect(error).toBeNull();
    expect(created!.author_id).toBe(me.userId);
    expect(created!.status).toBe("visible");

    // 재방문: 같은 세션으로 장소의 기록을 다시 읽는다
    const { data: mine } = await me.client.from("memories").select("id").eq("place_id", place.id);
    expect(mine!.map((m) => m.id)).toContain(created!.id);
  });

  it("공개 범위: 전체 공개만 남에게 보이고, 나만 보기·링크는 목록에 안 보인다", async () => {
    const place = await createPlace("open");
    const author = await anonymousVisitor();
    const other = await anonymousVisitor();

    const rows = await Promise.all(
      (["public", "private", "link"] as const).map(async (visibility) => {
        const { data, error } = await author.client
          .from("memories")
          .insert(sampleMemory(place.id, { visibility, letter: `${visibility} 편지` }))
          .select("id, visibility, share_token")
          .single();
        expect(error).toBeNull();
        return data!;
      }),
    );

    const { data: seen } = await other.client.from("memories").select("id, visibility").eq("place_id", place.id);
    expect(seen!.map((m) => m.visibility)).toEqual(["public"]);

    // 로그인 안 한 사람도 전체 공개는 볼 수 있다
    const { data: guestSeen } = await guest().from("memories").select("id").eq("place_id", place.id);
    expect(guestSeen).toHaveLength(1);

    // 링크 기록은 공유 토큰으로만 열린다
    const link = rows.find((r) => r.visibility === "link")!;
    const { data: shared } = await other.client.rpc("get_shared_memory", { token: link.share_token });
    expect(shared).toHaveLength(1);
    expect(shared![0].letter).toBe("link 편지");

    // 나만 보기는 토큰이 있어도 안 열린다
    const priv = rows.find((r) => r.visibility === "private")!;
    const { data: notShared } = await other.client.rpc("get_shared_memory", { token: priv.share_token });
    expect(notShared).toHaveLength(0);
  });

  it("운영 중이 아닌 장소에는 남길 수 없다", async () => {
    const closed = await createPlace("closed");
    const me = await anonymousVisitor();
    const { error } = await me.client.from("memories").insert(sampleMemory(closed.id));
    expect(error?.message).toContain("place_not_open");
  });

  it("로그인(익명 포함) 없이는 남길 수 없다", async () => {
    const place = await createPlace("open");
    const { error } = await guest().from("memories").insert(sampleMemory(place.id));
    expect(error).not.toBeNull();
  });

  it("전체 공개 기록에는 사진을 붙일 수 없다 (B안)", async () => {
    const place = await createPlace("open");
    const me = await anonymousVisitor();
    const { error } = await me.client
      .from("memories")
      .insert(sampleMemory(place.id, { visibility: "public", photo_path: `${me.userId}/x.jpg` }));
    expect(error?.message).toContain("public_memory_has_no_photo");

    const { error: okError } = await me.client
      .from("memories")
      .insert(sampleMemory(place.id, { visibility: "private", photo_path: `${me.userId}/y.jpg` }));
    expect(okError).toBeNull();
  });

  it("작성자는 숨김 상태나 신고 수를 바꿀 수 없다", async () => {
    const place = await createPlace("open");
    const me = await anonymousVisitor();
    const { data } = await me.client.from("memories").insert(sampleMemory(place.id)).select("id").single();
    const { error } = await me.client.from("memories").update({ status: "visible", report_count: 0 }).eq("id", data!.id);
    expect(error).not.toBeNull();
  });
});

describe("승인 없는 공개의 안전장치", () => {
  it("금칙어가 들어간 편지는 저장되지 않는다", async () => {
    const place = await createPlace("open");
    const me = await anonymousVisitor();
    const { error } = await me.client
      .from("memories")
      .insert(sampleMemory(place.id, { letter: "광고문의 주세요" }));
    expect(error?.message).toContain("blocked_word");
  });

  it("한 사람은 한 장소에 하루 5개까지만 남길 수 있다", async () => {
    const place = await createPlace("open");
    const me = await anonymousVisitor();
    for (let i = 0; i < 5; i++) {
      const { error } = await me.client.from("memories").insert(sampleMemory(place.id, { letter: `편지 ${i}` }));
      expect(error).toBeNull();
    }
    const { error } = await me.client.from("memories").insert(sampleMemory(place.id, { letter: "여섯 번째" }));
    expect(error?.message).toContain("daily_limit");
  });

  it("신고가 3번 쌓이면 자동으로 숨겨지고, 운영자가 되돌릴 수 있다", async () => {
    const place = await createPlace("open");
    const author = await anonymousVisitor();
    const { data: memory } = await author.client.from("memories").insert(sampleMemory(place.id)).select("id").single();

    const reporters = await Promise.all([anonymousVisitor(), anonymousVisitor(), anonymousVisitor()]);
    for (const [i, r] of reporters.entries()) {
      const { error } = await r.client.from("reports").insert({ memory_id: memory!.id, reason: "spam" });
      expect(error).toBeNull();
      const { data: visible } = await guest().from("memories").select("id").eq("id", memory!.id);
      expect(visible).toHaveLength(i < 2 ? 1 : 0);
    }

    // 같은 사람이 두 번 신고할 수는 없다
    const { error: dup } = await reporters[0].client.from("reports").insert({ memory_id: memory!.id, reason: "spam" });
    expect(dup).not.toBeNull();

    // 작성자는 숨겨진 자기 기록도 본다
    const { data: own } = await author.client.from("memories").select("status").eq("id", memory!.id).single();
    expect(own!.status).toBe("hidden");

    // 일반 방문객은 숨김을 풀 수 없고, 운영자는 풀 수 있다
    const { error: forbidden } = await author.client.rpc("set_memory_status", { memory: memory!.id, new_status: "visible" });
    expect(forbidden).not.toBeNull();
    const op = await operator();
    const { error: opError } = await op.client.rpc("set_memory_status", { memory: memory!.id, new_status: "visible" });
    expect(opError).toBeNull();
    const { data: back } = await guest().from("memories").select("id").eq("id", memory!.id);
    expect(back).toHaveLength(1);
  });
});

describe("운영자", () => {
  it("운영자만 장소를 만들고 참여 수를 볼 수 있다", async () => {
    const visitor = await anonymousVisitor();
    const { error: denied } = await visitor.client.from("places").insert({ slug: "nope-place", name: "x" });
    expect(denied).not.toBeNull();

    const op = await operator();
    const slug = `op-${crypto.randomUUID().slice(0, 8)}`;
    const { data: place, error } = await op.client
      .from("places")
      .insert({ slug, name: "운영자 장소", status: "open" })
      .select("id")
      .single();
    expect(error).toBeNull();

    await visitor.client.from("activity").insert({ place_id: place!.id, type: "enter" });
    await visitor.client.from("memories").insert(sampleMemory(place!.id));

    const { data: stats, error: statsError } = await op.client.rpc("place_stats", { place: place!.id });
    expect(statsError).toBeNull();
    expect(stats![0]).toMatchObject({ visitors: 1, entries: 1, memories: 1, hidden: 0, open_reports: 0 });

    const { error: notOp } = await visitor.client.rpc("place_stats", { place: place!.id });
    expect(notOp).not.toBeNull();
  });

  it("초안 상태 장소는 방문객에게 보이지 않는다", async () => {
    const draft = await createPlace("draft");
    const { data } = await guest().from("places").select("id").eq("id", draft.id);
    expect(data).toHaveLength(0);
    const { data: forAdmin } = await admin.from("places").select("id").eq("id", draft.id);
    expect(forAdmin).toHaveLength(1);
  });
});
