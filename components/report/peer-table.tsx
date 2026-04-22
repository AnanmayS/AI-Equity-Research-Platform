"use client";

import { ArrowDownUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PeerComparisonRow } from "@/lib/types";
import { formatPercent, formatRatio } from "@/lib/utils";

type SortKey = keyof Pick<PeerComparisonRow, "ticker" | "ps" | "growth" | "gross_margin" | "value_growth_score">;

export function PeerTable({ rows }: { rows: PeerComparisonRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("value_growth_score");
  const [ascending, setAscending] = useState(true);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];

      if (typeof left === "string" || typeof right === "string") {
        return ascending
          ? String(left).localeCompare(String(right))
          : String(right).localeCompare(String(left));
      }

      const leftValue = left ?? Number.POSITIVE_INFINITY;
      const rightValue = right ?? Number.POSITIVE_INFINITY;
      return ascending ? leftValue - rightValue : rightValue - leftValue;
    });
  }, [ascending, rows, sortKey]);

  function sort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setAscending((value) => !value);
      return;
    }
    setSortKey(nextKey);
    setAscending(nextKey === "value_growth_score");
  }

  const head = (label: string, key: SortKey) => (
    <Button variant="ghost" size="sm" onClick={() => sort(key)} className="-ml-3">
      {label}
      <ArrowDownUp className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{head("Ticker", "ticker")}</TableHead>
          <TableHead>{head("Price vs sales", "ps")}</TableHead>
          <TableHead>{head("Sales growth", "growth")}</TableHead>
          <TableHead>{head("Gross profit", "gross_margin")}</TableHead>
          <TableHead>{head("Price/growth score", "value_growth_score")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.map((row) => (
          <TableRow key={row.ticker}>
            <TableCell className="font-medium">{row.ticker}</TableCell>
            <TableCell>{formatRatio(row.ps)}</TableCell>
            <TableCell>{formatPercent(row.growth)}</TableCell>
            <TableCell>{formatPercent(row.gross_margin)}</TableCell>
            <TableCell>{formatRatio(row.value_growth_score)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
