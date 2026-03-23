"use client";

import Link from "next/link";

export default function BrandMark({
  href,
  compact = false,
}: {
  href?: string;
  compact?: boolean;
}) {
  const content = (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-orange-600 text-white text-xs font-bold">
        JTN
      </span>
      {!compact && (
        <span className="text-sm sm:text-base font-semibold tracking-tight text-stone-900">
          JTN Scheduler
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}

