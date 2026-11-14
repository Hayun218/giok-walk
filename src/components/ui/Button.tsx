import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "accent";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-md font-medium transition-[opacity,transform] duration-[var(--duration-fast)] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-contrast",
  secondary: "border border-border bg-surface text-text",
  ghost: "text-text-muted underline-offset-4 hover:underline",
  accent: "bg-accent text-accent-contrast",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}
