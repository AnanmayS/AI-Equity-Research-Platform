import { ReportWorkspace } from "@/components/report/report-workspace";
import { normalizeTicker } from "@/lib/utils";

export default async function ReportPage({
  params,
  searchParams
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ peers?: string }>;
}) {
  const { ticker } = await params;
  const { peers } = await searchParams;
  const peerTickers =
    peers
      ?.split(",")
      .map(normalizeTicker)
      .filter(Boolean) || [];

  return <ReportWorkspace ticker={normalizeTicker(ticker)} peerTickers={peerTickers} />;
}
