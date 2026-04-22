"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { AnalyzeForm } from "@/components/report/analyze-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InvestmentReport } from "@/lib/types";

export default function ReportsPage() {
  const { session, user } = useAuth();
  const [reports, setReports] = useState<InvestmentReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;

    setLoading(true);
    fetch("/api/reports", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
      .then((response) => response.json())
      .then((payload) => setReports(payload.reports || []))
      .finally(() => setLoading(false));
  }, [session]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-accent">Saved work</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">Reports</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Saved memos stay here so you can reopen old research without rerunning it.
            </p>
          </div>
          <div className="w-full md:max-w-md">
            <AnalyzeForm compact />
          </div>
        </div>

        {!user ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>Saved reports are tied to Supabase Auth users.</CardDescription>
            </CardHeader>
          </Card>
        ) : loading ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading reports</CardTitle>
              <CardDescription>Fetching saved analysis from Supabase.</CardDescription>
            </CardHeader>
          </Card>
        ) : reports.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No reports yet</CardTitle>
              <CardDescription>Run an analysis while signed in and it will appear here.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold">{report.ticker}</p>
                      <p className="text-sm text-muted-foreground">{report.stockData.companyName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button asChild>
                    <Link href={`/reports/${report.id}`}>Open</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
