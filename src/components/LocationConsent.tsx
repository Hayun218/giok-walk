"use client";

import { Button } from "@/components/ui/Button";
import type { LocationState } from "@/lib/useLocation";

/** 위치를 묻기 전에 이유를 먼저 말한다. 위치는 휴대폰 안에서만 쓴다. */
export function LocationConsent({
  state,
  onAllow,
  purpose,
}: {
  state: LocationState;
  onAllow: () => void;
  purpose: "nearby" | "here";
}) {
  if (state.status === "ok") return null;
  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface-sunken p-4" aria-live="polite">
      {state.status === "denied" ? (
        <p className="text-sm">
          지금 계신 곳을 확인할 수 없어요. 휴대폰 설정에서 이 사이트의 위치 사용을 허용하면 다시 해 볼 수 있어요.
        </p>
      ) : state.status === "unavailable" ? (
        <p className="text-sm">지금 계신 곳을 찾지 못했어요. 하늘이 보이는 곳에서 다시 해 볼까요?</p>
      ) : (
        <p className="text-sm">
          {purpose === "nearby"
            ? "가까운 기억 장소를 찾아 드릴게요."
            : "마음은 그 장소에 가 있을 때 남길 수 있어요. 지금 이곳에 계신지 확인할게요."}{" "}
          <span className="text-text-muted">위치는 이 휴대폰 안에서만 쓰고, 저장하거나 보내지 않아요.</span>
        </p>
      )}
      <Button onClick={onAllow} disabled={state.status === "asking"}>
        {state.status === "asking" ? "확인하는 중…" : state.status === "idle" ? "지금 계신 곳 확인하기" : "다시 확인하기"}
      </Button>
    </section>
  );
}
