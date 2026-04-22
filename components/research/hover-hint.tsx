import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

export function HoverHint({
  text,
  className
}: {
  text: string;
  className?: string;
}) {
  return (
    <span
      tabIndex={0}
      aria-label={text}
      className={cn(
        "group relative inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground",
        className
      )}
    >
      <Info className="h-3 w-3" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-52 -translate-x-1/2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-left text-xs font-normal leading-5 text-foreground shadow-soft group-hover:block group-focus-visible:block">
        {text}
      </span>
    </span>
  );
}
