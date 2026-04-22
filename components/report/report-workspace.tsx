"use client";

import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { AnalyzeForm } from "@/components/report/analyze-form";
import { ReportView } from "@/components/report/report-view";
import { LoadingTimeline } from "@/components/research/loading-timeline";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InvestmentReport, StreamEvent } from "@/lib/types";

export function ReportWorkspace({
  ticker,
  peerTickers = []
}: {
  ticker: string;
  peerTickers?: string[];
}) {
  const { session } = useAuth();
  const [report, setReport] = useState<InvestmentReport | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const runAnalysis = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setReport(null);
      setError(null);
      setMessages([]);

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({ ticker, refresh, peerTickers })
        });

        if (!response.body) throw new Error("No response stream returned.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as StreamEvent;

            if (event.type === "status") {
              setMessages((current) =>
                current.includes(event.message) ? current : [...current, event.message]
              );
            }

            if (event.type === "error") {
              setError(event.message);
            }

            if (event.type === "final") {
              setReport(event.report);
            }
          }
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to analyze ticker.");
      } finally {
        setLoading(false);
      }
    },
    [peerTickers, session, ticker]
  );

  useEffect(() => {
    runAnalysis(false);
  }, [runAnalysis]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <p className="text-sm font-medium text-accent">Research memo</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">{ticker}</h1>
            {peerTickers.length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Custom peer set: {peerTickers.join(", ")}
              </p>
            ) : null}
          </div>
          <div className="w-full md:max-w-md">
            <AnalyzeForm compact />
          </div>
        </div>

        {loading ? <LoadingTimeline statuses={messages} error={error} /> : null}
        {error ? <ErrorPanel message={error} /> : null}
        {report ? <ReportView report={report} onRefresh={() => runAnalysis(true)} /> : null}
      </div>
    </main>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <Card className="mt-6 border-destructive/40 bg-destructive/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Analysis stopped
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  );
}
