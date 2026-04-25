export function MetricCard({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const color =
    tone === "good" ? "text-mint" : tone === "warn" ? "text-amber" : tone === "bad" ? "text-coral" : "text-white";
  return (
    <div className="rounded-md border border-line bg-panel/82 p-4 shadow-glow">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

