import { HoverHint } from "@/components/research/hover-hint";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  className
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("py-2", className)}>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>{label}</span>
        {hint ? <HoverHint text={hint} /> : null}
      </div>
      <div className="mt-1 text-lg font-medium tabular-nums">{value}</div>
    </div>
  );
}
