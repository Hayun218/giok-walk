"use client";

import { useEffect, type ReactNode } from "react";

/** 아래에서 올라오는 시트. 권한 안내, 편지 열기 등에 쓴다. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--palette-ink)_45%,transparent)]"
      />
      <div
        className={`relative max-h-[88dvh] w-full max-w-[var(--page-max-width)] overflow-y-auto rounded-t-[var(--radius-lg)] px-[var(--page-gutter)] pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)] bg-bg text-text`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        {title && <h2 className="mb-3 text-xl">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
