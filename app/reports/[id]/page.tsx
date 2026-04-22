"use client";

import { AlertTriangle } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { ReportView } from "@/components/report/report-view";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InvestmentReport } from "@/lib/types";

export default function SavedReportPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const [report, setReport] = useState<InvestmentReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !params.id) return;

    fetch(`/api/reports/${params.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to fetch report.");
        setReport(payload.report);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to fetch report."));
  }, [params.id, session]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {error ? (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Report unavailable
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : report ? (
          <ReportView report={report} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Loading report</CardTitle>
              <CardDescription>Fetching saved report from Supabase.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}
