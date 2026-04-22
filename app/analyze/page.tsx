import { redirect } from "next/navigation";

import { AnalyzeForm } from "@/components/report/analyze-form";
import { normalizeTicker } from "@/lib/utils";

export default async function AnalyzePage({
  searchParams
}: {
  searchParams: Promise<{ ticker?: string }>;
}) {
  const { ticker } = await searchParams;
  const normalized = normalizeTicker(ticker || "");

  if (normalized) {
    redirect(`/report/${normalized}`);
  }

  return (
    <main className="mesh-bg min-h-[calc(100vh-4rem)]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
        <p className="text-sm font-medium text-accent">New memo</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-normal">Analyze a stock</h1>
        <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
          Start with a ticker and optional peers. The report will separate the opportunity from the risk.
        </p>
        <div className="mt-8 w-full">
          <AnalyzeForm />
        </div>
      </section>
    </main>
  );
}
