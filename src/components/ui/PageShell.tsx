import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Orb } from "@/components/Orb";

/** 모바일 한 단 레이아웃. 위에 로고, 오른쪽에 "내 기억" */
export function PageShell({
  children,
  back,
  className = "",
}: {
  children: ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[var(--page-max-width)] flex-1 flex-col pt-[env(safe-area-inset-top)] pr-[max(env(safe-area-inset-right),var(--page-gutter))] pb-[max(env(safe-area-inset-bottom),1.5rem)] pl-[max(env(safe-area-inset-left),var(--page-gutter))]">
      <header className="flex h-14 items-center justify-between">
        {back ? (
          <Link href={back.href} className="-ml-2 flex items-center gap-1 px-2 py-2 text-sm text-text-muted">
            <span aria-hidden>←</span> {back.label}
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-2">
            <Orb size={22} />
            <Logo className="!text-lg" />
          </Link>
        )}
        <Link href="/me" className="px-2 py-2 text-sm text-text-muted">
          내 기억
        </Link>
      </header>
      <main className={`flex flex-1 flex-col ${className}`}>{children}</main>
    </div>
  );
}
