import { cn } from "@/lib/utils";

function scoreColor(score: number, invert: boolean) {
  const adjusted = invert ? 11 - score : score;
  if (adjusted >= 7) return "text-success";
  if (adjusted >= 4) return "text-warning";
  return "text-destructive";
}

export function MemoScoreBadge({
  score,
  label,
  invert = false,
  outOf = 10,
  className
}: {
  score: number | null | undefined;
  label?: string;
  invert?: boolean;
  outOf?: number;
  className?: string;
}) {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        {label ? <span>{label}</span> : null}N/A
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      {label ? <span className="text-muted-foreground">{label}</span> : null}
      <span className={cn("font-mono font-medium tabular-nums", scoreColor(score, invert))}>
        {score.toFixed(score % 1 === 0 ? 0 : 1)}
        <span className="text-muted-foreground">/{outOf}</span>
      </span>
    </span>
  );
}
