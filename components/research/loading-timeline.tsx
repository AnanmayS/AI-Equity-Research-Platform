import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: "fetch", label: "Fetching real financial data", match: /fetch|financial|stock data/i },
  { id: "peers", label: "Comparing similar companies", match: /peer|compar|similar/i },
  { id: "deep", label: "Running deep dive", match: /deep dive|business|moat|catalyst/i },
  { id: "bear", label: "Building bear case", match: /bear|risk|downside/i },
  { id: "report", label: "Preparing report", match: /report|finaliz|preparing|wrap/i }
];

export function LoadingTimeline({
  statuses,
  error
}: {
  statuses: string[];
  error?: string | null;
}) {
  let activeIndex = 0;
  statuses.forEach((status) => {
    STEPS.forEach((step, index) => {
      if (step.match.test(status) && index > activeIndex) activeIndex = index;
    });
  });

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6">
      <ol className="space-y-3">
        {STEPS.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex && !error;

          return (
            <li key={step.id} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs",
                  done && "text-success",
                  active && "text-foreground",
                  !done && !active && "text-muted-foreground/40"
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              <span
                className={cn(
                  "text-sm",
                  done || active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-xs text-muted-foreground">
        We pull real financial data first. The AI never invents the numbers.
      </p>
      {error ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
