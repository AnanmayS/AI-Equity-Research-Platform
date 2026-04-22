import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  subtitle,
  eyebrow,
  children,
  action,
  className
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground text-pretty">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
