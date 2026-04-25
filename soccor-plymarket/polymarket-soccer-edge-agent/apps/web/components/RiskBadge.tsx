export function RiskBadge({ label, tone = "neutral" }: { label: string; tone?: "good" | "warn" | "bad" | "neutral" }) {
  const classes =
    tone === "good"
      ? "border-mint/50 bg-mint/10 text-mint"
      : tone === "warn"
        ? "border-amber/50 bg-amber/10 text-amber"
        : tone === "bad"
          ? "border-coral/50 bg-coral/10 text-coral"
          : "border-line bg-panel text-slate-200";
  return <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${classes}`}>{label}</span>;
}

