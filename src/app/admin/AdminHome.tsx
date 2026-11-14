"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Place } from "@/lib/types";
import { OperatorGate } from "./OperatorGate";
import { useOperator } from "./useOperator";

const STATUS_LABEL = { draft: "준비 중", open: "운영 중", closed: "종료" } as const;
const MODE_LABEL = { event: "행사", partner: "장소 제휴", personal: "개인" } as const;

export function AdminHome() {
  const { state, recheck } = useOperator();
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from("places").select("*").order("created_at", { ascending: false });
    setPlaces(data ?? []);
  }, []);

  useEffect(() => {
    if (state !== "operator") return;
    let alive = true;
    supabaseBrowser()
      .from("places")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => alive && setPlaces(data ?? []));
    return () => {
      alive = false;
    };
  }, [state]);

  if (state === "loading") return <PageShell>{null}</PageShell>;
  if (state === "visitor")
    return (
      <PageShell className="pt-6">
        <OperatorGate onDone={recheck} />
      </PageShell>
    );

  return (
    <PageShell className="gap-6 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">장소</h1>
        <Button variant="secondary" className="min-h-10 px-4 text-sm" onClick={() => setCreating((v) => !v)}>
          {creating ? "닫기" : "새 장소"}
        </Button>
      </div>
      {creating && (
        <NewPlaceForm
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
      <ul className="flex flex-col gap-2">
        {places?.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/places/${p.id}`} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-4">
              <span className="flex flex-col">
                <span className="font-medium">{p.name}</span>
                <span className="font-date text-xs text-text-muted">/p/{p.slug} · {MODE_LABEL[p.mode]}</span>
              </span>
              <span className="shrink-0 rounded-full bg-surface-sunken px-3 py-1 text-xs">{STATUS_LABEL[p.status]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}

function NewPlaceForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", slug: "", venue_name: "", description: "", prompt: "", mode: "event", object_kind: "orb" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await supabaseBrowser()
      .from("places")
      .insert({
        name: form.name,
        slug: form.slug,
        venue_name: form.venue_name || null,
        description: form.description || null,
        prompt: form.prompt || null,
        mode: form.mode as Place["mode"],
        object_kind: form.object_kind as Place["object_kind"],
        status: "draft",
      });
    if (err) setError(err.message.includes("duplicate") ? "이미 쓰는 주소예요." : "입력값을 확인해 주세요. 주소는 영문 소문자·숫자·-만 돼요.");
    else onCreated();
  }

  const field = "min-h-11 rounded-[var(--radius-sm)] border border-border bg-surface px-3 outline-none focus:border-text";
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface-sunken p-4 text-sm">
      <label className="flex flex-col gap-1">이름<input required className={field} value={form.name} onChange={set("name")} placeholder="2026 포항 겨울빛 축제" /></label>
      <label className="flex flex-col gap-1">QR 주소<input required className={`${field} font-date`} value={form.slug} onChange={set("slug")} placeholder="pohang-winter" pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]" /></label>
      <label className="flex flex-col gap-1">장소 설명 (선택)<input className={field} value={form.venue_name} onChange={set("venue_name")} placeholder="포항 영일대 해수욕장" /></label>
      <label className="flex flex-col gap-1">소개 (선택)<textarea className={`${field} py-2`} rows={2} value={form.description} onChange={set("description")} /></label>
      <label className="flex flex-col gap-1">질문 카드 (선택)<input className={field} value={form.prompt} onChange={set("prompt")} placeholder="오늘 가장 오래 바라본 풍경은?" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">운영 방식
          <select className={field} value={form.mode} onChange={set("mode")}>
            <option value="event">행사</option><option value="partner">장소 제휴</option><option value="personal">개인</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">오브젝트
          <select className={field} value={form.object_kind} onChange={set("object_kind")}>
            <option value="orb">구슬</option><option value="envelope">편지 봉투</option>
          </select>
        </label>
      </div>
      {error && <p className="text-danger">{error}</p>}
      <Button type="submit">만들기 (준비 중 상태로)</Button>
    </form>
  );
}
