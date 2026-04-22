"use client";

import { ArrowRight, BookmarkPlus, Download, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { SimilarIdeas } from "@/components/discovery/similar-ideas";
import { MemoScoreBadge } from "@/components/research/memo-score-badge";
import { MetricCard } from "@/components/research/metric-card";
import { PeerComparisonTable } from "@/components/research/peer-comparison-table";
import { SectionCard } from "@/components/research/section-card";
import { Button } from "@/components/ui/button";
import type { InvestmentReport } from "@/lib/types";
import { formatCompactNumber, formatPercent, formatRatio } from "@/lib/utils";

function BulletList({
  items,
  tone = "default"
}: {
  items: string[];
  tone?: "default" | "warning" | "danger";
}) {
  const dot =
    tone === "danger" ? "bg-destructive" : tone === "warning" ? "bg-warning" : "bg-muted-foreground";

  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-3 text-sm leading-relaxed text-pretty">
          <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${dot}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReportView({
  report,
  onRefresh
}: {
  report: InvestmentReport;
  onRefresh?: () => void;
}) {
  const { session } = useAuth();
  const [watchlistMessage, setWatchlistMessage] = useState<string | null>(null);

  async function addToWatchlist() {
    if (!session) {
      setWatchlistMessage("Sign in to save tickers.");
      return;
    }

    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        ticker: report.ticker,
        companyName: report.stockData.companyName
      })
    });

    if (response.ok) {
      setWatchlistMessage("Added to watchlist.");
      return;
    }

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setWatchlistMessage(payload?.error || "Unable to add ticker.");
  }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    const lines = [
      `${report.ticker} Investment Report`,
      report.stockData.companyName,
      "",
      `Final rating: ${report.deepDive.final_rating}/10`,
      `Key insight: ${report.deepDive.key_insight}`,
      "",
      "Deep Dive",
      report.deepDive.business_summary,
      "",
      "Peer Comparison",
      report.peerComparison.valuation_summary,
      "",
      "Bear Case",
      report.bearCase.bear_summary
    ];

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(lines[0], 14, 18);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(pdf.splitTextToSize(lines.slice(1).join("\n"), 180), 14, 30);
    pdf.save(`${report.ticker}-investment-report.pdf`);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="font-mono text-sm text-muted-foreground">{report.ticker}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal sm:text-3xl">
              {report.stockData.companyName}
            </h1>
            <p className="mt-3 max-w-3xl border-l-2 border-foreground/40 pl-4 text-sm leading-relaxed text-pretty">
              {report.deepDive.key_insight}
            </p>
            {watchlistMessage ? (
              <p className="mt-3 text-sm text-muted-foreground">{watchlistMessage}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={addToWatchlist}>
              <BookmarkPlus className="h-4 w-4" />
              Watch
            </Button>
            <Button variant="ghost" onClick={exportPdf}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
            {onRefresh ? (
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <SummaryStrip report={report} />

      <SectionCard
        eyebrow="Snapshot"
        title={report.stockData.companyName || report.ticker}
        subtitle={[report.stockData.sector, report.stockData.industry].filter(Boolean).join(" · ")}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <PlainCard label="What the company does" text={companySummary(report)} />
          <PlainCard label="Why it is interesting" text={interestingSummary(report)} />
          <PlainCard label="Why it is dangerous" text={dangerSummary(report)} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Market cap" value={formatCompactNumber(report.stockData.marketCap)} />
          <MetricCard
            label="Revenue growth"
            value={formatPercent(report.stockData.revenueGrowthYoY)}
            hint="How much yearly sales grew vs the prior year."
          />
          <MetricCard
            label="Gross margin"
            value={formatPercent(report.stockData.grossMargin)}
            hint="Profit kept after the direct cost of making the product."
          />
          <MetricCard
            label="Operating margin"
            value={formatPercent(report.stockData.operatingMargin)}
            hint="Profit left after running the business."
          />
          <MetricCard
            label="P/S ratio"
            value={formatRatio(report.stockData.psRatio)}
            hint="Price compared with yearly sales. Lower can mean cheaper."
          />
          <MetricCard
            label="P/E ratio"
            value={formatRatio(report.stockData.peRatio)}
            hint="Price compared with yearly profit. Lower can mean cheaper."
          />
        </div>
        <DataSourceNotice report={report} />
      </SectionCard>

      <SectionCard
        eyebrow="Why it is interesting"
        title="The bull case"
        subtitle="A plain-English read on the business and what could push the stock higher."
        action={
          <div className="hidden flex-col items-end gap-1.5 sm:flex">
            <MemoScoreBadge label="Strength" score={report.deepDive.moat_score} />
            <MemoScoreBadge label="Upside" score={report.deepDive.asymmetry_score} />
            <MemoScoreBadge label="Overall" score={report.deepDive.final_rating} />
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3 sm:hidden">
          <MemoScoreBadge label="Strength" score={report.deepDive.moat_score} />
          <MemoScoreBadge label="Upside" score={report.deepDive.asymmetry_score} />
          <MemoScoreBadge label="Overall" score={report.deepDive.final_rating} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Business in plain English
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-pretty">
              {report.deepDive.business_summary || "N/A"}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Who it competes with
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-pretty">
              {report.deepDive.competition_summary || "N/A"}
            </p>
          </div>
        </div>

        {report.deepDive.catalysts.length > 0 ? (
          <div className="mt-6 border-t border-border pt-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              What could make the stock work
            </h3>
            <BulletList items={report.deepDive.catalysts} />
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        eyebrow="Why it could be dangerous"
        title="The bear case"
        subtitle="What could go wrong and signs the bullish idea may be flawed."
        action={<MemoScoreBadge label="Bear confidence" score={report.bearCase.confidence_in_bear_case} />}
      >
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
          {report.bearCase.bear_summary}
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Top risks
            </h3>
            <BulletList items={report.bearCase.top_risks} tone="warning" />
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Signs the idea may be wrong
            </h3>
            <BulletList items={report.bearCase.thesis_breakers} tone="danger" />
          </div>
        </div>
      </SectionCard>

      <PeerComparisonTable
        data={report.peerComparison}
        targetTicker={report.ticker}
        subtitle={plainValuationSummary(report)}
      />

      <BetterPeerCard report={report} />

      <SectionCard eyebrow="Takeaway" title="The short version">
        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">Overall rating</div>
            <div className="mt-2">
              <MemoScoreBadge score={report.deepDive.final_rating} />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Bear-case strength</div>
            <div className="mt-2">
              <MemoScoreBadge score={report.bearCase.confidence_in_bear_case} />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Most attractive peer</div>
            <div className="mt-2 font-mono text-sm">
              {report.peerComparison.most_undervalued || "N/A"}
            </div>
          </div>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Research support only, not financial advice.
        </p>
      </SectionCard>

      <SimilarIdeas ticker={report.ticker} />
    </div>
  );
}

function PlainCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/30 p-4">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground text-pretty">{text}</p>
    </div>
  );
}

function SummaryStrip({ report }: { report: InvestmentReport }) {
  const bestPeer = report.peerComparison.most_undervalued?.toUpperCase();
  const risk = report.bearCase.top_risks[0] || report.bearCase.bear_summary || "No major risk returned.";

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <PlainCard
        label="Overall read"
        text={`${verdictLabel(report)} Final score: ${report.deepDive.final_rating}/10.`}
      />
      <PlainCard
        label="Similar stock to check"
        text={peerSummaryText(report.ticker, bestPeer)}
      />
      <PlainCard label="Main thing to watch" text={risk} />
    </section>
  );
}

function peerSummaryText(ticker: string, bestPeer?: string) {
  if (!bestPeer) return "No cleaner peer candidate was returned for this report.";
  if (bestPeer === ticker.toUpperCase()) return `${ticker} screens best in this peer group.`;
  return `${bestPeer} screens cheaper on the simple price-vs-growth comparison.`;
}

function verdictLabel(report: InvestmentReport) {
  const score = report.deepDive.final_rating;
  const bearConfidence = report.bearCase.confidence_in_bear_case;

  if (score >= 8 && bearConfidence <= 5) return "Strong idea, but still needs research.";
  if (score >= 7) return "Interesting idea with real risks.";
  if (score >= 5) return "Mixed setup.";
  return "Caution setup.";
}

function DataSourceNotice({ report }: { report: InvestmentReport }) {
  const provider = report.stockData.source.provider;
  const warnings = report.stockData.source.warnings || [];
  const shouldShow = provider !== "financialmodelingprep" || warnings.length > 0;

  if (!shouldShow) return null;

  return (
    <div className="mt-4 rounded-md border border-border bg-background/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
      <span className="font-medium text-foreground">Data source:</span>{" "}
      {dataSourceLabel(provider)}
      {warnings[0] ? ` ${warnings[0]}` : ""}
    </div>
  );
}

function dataSourceLabel(provider: InvestmentReport["stockData"]["source"]["provider"]) {
  if (provider === "finnhub") return "Finnhub fallback.";
  if (provider === "financialmodelingprep_sec") return "Financial Modeling Prep plus SEC filings.";
  if (provider === "sec_stooq") return "SEC/Stooq no-key fallback.";
  return "Financial Modeling Prep.";
}

function BetterPeerCard({ report }: { report: InvestmentReport }) {
  const best = report.peerComparison.most_undervalued?.toUpperCase();
  if (!best) return null;

  const isSelf = best === report.ticker.toUpperCase();
  const peer = report.stockData.peers?.find((row) => row.ticker?.toUpperCase() === best);
  const insights = peerInsights(report);

  return (
    <SectionCard
      eyebrow="Better similar stocks?"
      title={isSelf ? `${report.ticker} ranks best in this peer group` : `Worth a look: ${best}`}
      subtitle="This is a starting point for comparison, not a buy recommendation."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-prose text-sm leading-6 text-muted-foreground text-pretty">
          {isSelf
            ? `Based on the value-vs-growth score, ${report.ticker} looks most attractive among the available peers.`
            : `${peer?.companyName || best} looks more attractive than ${report.ticker} on the same simple valuation and growth metrics.`}
        </p>
        {!isSelf ? (
          <Link
            href={`/report/${best}`}
            className="inline-flex items-center gap-1 self-start rounded-md border border-border px-3 py-1.5 text-sm hover:border-border-strong"
          >
            Analyze {best} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      {insights.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {insights.map((insight) => (
            <PlainCard key={`${insight.ticker}-${insight.label}`} label={`${insight.ticker} · ${insight.label}`} text={insight.text} />
          ))}
        </div>
      ) : null}
    </SectionCard>
  );
}

function companySummary(report: InvestmentReport) {
  return (
    simpleCompanyDescription(report.stockData.description) ||
    firstTwoSentences(report.deepDive.business_summary) ||
    `${report.stockData.companyName} is the public company behind ${report.ticker}.`
  );
}

function interestingSummary(report: InvestmentReport) {
  const growth = formatPercent(report.stockData.revenueGrowthYoY);
  const asymmetry = report.deepDive.asymmetry_score;
  const catalyst = report.deepDive.catalysts[0];

  if (catalyst) {
    return `${report.ticker} is worth a look because sales are growing ${growth}, the upside setup score is ${asymmetry}/10, and one thing that could help is: ${catalyst}`;
  }

  return report.deepDive.key_insight;
}

function dangerSummary(report: InvestmentReport) {
  const risk = report.bearCase.top_risks[0];
  const ps = formatRatio(report.stockData.psRatio);
  const operatingMargin = formatPercent(report.stockData.operatingMargin);

  if (risk) {
    return `${report.ticker} is risky if this concern proves true: ${risk}`;
  }

  return `The main concerns are price and profits. The stock trades at ${ps} times sales, and operating margin is ${operatingMargin}.`;
}

function plainValuationSummary(report: InvestmentReport) {
  const score = report.peerComparison.peer_table.find((row) => row.ticker === report.ticker)
    ?.value_growth_score;
  const best = report.peerComparison.most_undervalued;

  if (score === null || score === undefined) {
    return `${report.ticker} was compared with similar companies, but some valuation or growth data was missing. The table below shows what data was available.`;
  }

  return `${report.ticker} has a price-vs-growth score of ${formatRatio(score)}. Lower is generally better because it means investors are paying less for each point of sales growth. In this group, ${best} screens cheapest on that simple measure.`;
}

function peerInsights(report: InvestmentReport) {
  const rows = report.peerComparison.peer_table;
  const target = rows.find((row) => row.ticker === report.ticker);
  const peers = rows.filter((row) => row.ticker !== report.ticker);
  const insights: Array<{
    ticker: string;
    label: string;
    text: string;
  }> = [];

  if (!target || peers.length === 0) return insights;

  const cheaper = peers
    .filter((peer) => peer.ps !== null && target.ps !== null && peer.ps < target.ps)
    .sort((left, right) => (left.ps ?? Infinity) - (right.ps ?? Infinity))[0];

  if (cheaper) {
    insights.push({
      ticker: cheaper.ticker,
      label: "Cheaper-looking peer",
      text: `${cheaper.ticker} trades at ${formatRatio(cheaper.ps)} times sales versus ${report.ticker} at ${formatRatio(target.ps)}. Investors are paying less for each dollar of sales, though cheaper stocks can still be cheap for a reason.`
    });
  }

  const faster = peers
    .filter(
      (peer) =>
        peer.growth !== null &&
        target.growth !== null &&
        peer.growth > target.growth &&
        peer.ps !== null &&
        target.ps !== null &&
        peer.ps <= target.ps * 1.25
    )
    .sort((left, right) => (right.growth ?? -Infinity) - (left.growth ?? -Infinity))[0];

  if (faster && !insights.some((insight) => insight.ticker === faster.ticker)) {
    insights.push({
      ticker: faster.ticker,
      label: "Faster growth at a reasonable price",
      text: `${faster.ticker} is growing sales faster than ${report.ticker} while trading at a similar or lower price compared with sales. That can make it worth comparing more closely.`
    });
  }

  const betterScore = peers
    .filter(
      (peer) =>
        peer.value_growth_score !== null &&
        target.value_growth_score !== null &&
        peer.value_growth_score < target.value_growth_score
    )
    .sort((left, right) => (left.value_growth_score ?? Infinity) - (right.value_growth_score ?? Infinity))[0];

  if (betterScore && !insights.some((insight) => insight.ticker === betterScore.ticker)) {
    insights.push({
      ticker: betterScore.ticker,
      label: "Best price-vs-growth score",
      text: `${betterScore.ticker} has a better price-vs-growth score than ${report.ticker}. In simple terms, the market is paying less for each point of sales growth.`
    });
  }

  return insights.slice(0, 3);
}

function simpleCompanyDescription(description: string) {
  const clean = firstTwoSentences(description);
  if (!clean) return "";

  return clean
    .replace(/^(.+?) engages in the /i, "$1 ")
    .replace(/^(.+?) operates as /i, "$1 is ")
    .replace(/\bprovides\b/i, "sells")
    .replace(/\boffers\b/i, "sells");
}

function firstTwoSentences(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const sentences = trimmed.match(/[^.!?]+[.!?]/g);
  return sentences?.slice(0, 2).join(" ").trim() || trimmed;
}
