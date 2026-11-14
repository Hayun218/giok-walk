import Image from "next/image";
import { brand } from "@/config/brand";

/** 로고 자리. 교체는 src/config/brand.ts 에서만 한다. */
export function Logo({ className = "" }: { className?: string }) {
  if (brand.logo.src) {
    return (
      <Image
        src={brand.logo.src}
        alt={brand.name}
        width={brand.logo.width}
        height={brand.logo.height}
        className={className}
        priority
      />
    );
  }
  return (
    <span className={`font-title text-xl font-bold tracking-tight ${className}`}>
      {brand.name}
    </span>
  );
}
