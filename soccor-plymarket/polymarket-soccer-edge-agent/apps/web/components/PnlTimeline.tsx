export function PnlTimeline({
  points
}: {
  points: Array<{ label: string; pnl: number; cumulative_pnl: number }>;
}) {
  if (!points.length) {
    return <p className="text-sm text-slate-400">No settled events yet, so the PnL curve is still flat.</p>;
  }
  const max = Math.max(...points.map((point) => Math.abs(point.cumulative_pnl)), 1);
  return (
    <div className="space-y-3">
      {points.map((point) => {
        const width = Math.max((Math.abs(point.cumulative_pnl) / max) * 100, 6);
        const positive = point.cumulative_pnl >= 0;
        return (
          <div key={`${point.label}-${point.cumulative_pnl}`}>
            <div className="mb-1 flex justify-between text-sm text-slate-300">
              <span>{point.label}</span>
              <span>{point.cumulative_pnl.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded-sm bg-white/10">
              <div
                className={`h-2 rounded-sm ${positive ? "bg-mint" : "bg-coral"}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

