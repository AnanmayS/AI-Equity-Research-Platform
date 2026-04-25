import { API_BASE } from "@/lib/api";

export default async function SettingsPage() {
  const settings = await fetch(`${API_BASE}/settings`, { cache: "no-store" }).then((response) => response.json());
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <p className="mt-2 text-slate-300">Provider and paper-trading defaults. Secrets stay in environment variables.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h2 className="text-xl font-semibold text-white">Model Provider</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="AI enabled" value={String(settings.ai_enabled)} />
            <Row label="Provider" value={settings.llm_provider} />
            <Row label="No-key fallback" value="Deterministic summaries" />
          </dl>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h2 className="text-xl font-semibold text-white">Data & Risk</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Soccer data" value={settings.soccer_data_provider} />
            <Row label="Default fill" value={settings.paper_defaults?.fill_mode ?? "market"} />
            <Row label="Max bets / day" value={String(settings.paper_defaults?.max_trades_per_day ?? 5)} />
            <Row label="Max stake / bet" value={`$${String(settings.paper_defaults?.max_stake_per_trade ?? 100)}`} />
            <Row label="Min edge" value={String(settings.paper_defaults?.min_edge ?? 0.04)} />
            <Row label="Min confidence" value={String(settings.paper_defaults?.min_confidence ?? 0.4)} />
            <Row label="Manual trading" value="Disabled" />
            <Row label="Live trading" value="Disabled in v1" />
          </dl>
        </div>
      </section>
      <section className="rounded-md border border-line bg-panel/80 p-5">
        <h2 className="text-xl font-semibold text-white">Environment</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Use <code className="rounded bg-pitch px-1.5 py-1">LLM_PROVIDER=gemini</code>, <code className="rounded bg-pitch px-1.5 py-1">openrouter</code>, or <code className="rounded bg-pitch px-1.5 py-1">ollama</code> with the matching optional key. With no key, analysis remains deterministic and the app still works.
        </p>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/70 pb-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}
