"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabaseBrowser } from "@/lib/supabase/client";

export function OperatorGate({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await supabaseBrowser().auth.getSession();
    const res = await fetch("/api/operator/claim", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ code }),
    });
    if (res.ok) onDone();
    else setNote("코드가 맞지 않아요.");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h1 className="text-xl">운영자 화면</h1>
      <p className="text-sm text-text-muted">받은 운영자 코드를 넣어 주세요. 이 기기의 계정이 운영자가 돼요.</p>
      <input
        aria-label="운영자 코드"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="min-h-12 rounded-full border border-border bg-surface px-4 font-date outline-none focus:border-text"
        autoComplete="off"
      />
      <Button type="submit">들어가기</Button>
      {note && <p className="text-sm text-danger">{note}</p>}
    </form>
  );
}
