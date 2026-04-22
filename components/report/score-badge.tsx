import { Badge } from "@/components/ui/badge";

export function ScoreBadge({ label, score }: { label: string; score: number }) {
  const variant = score >= 8 ? "success" : score >= 5 ? "warning" : "danger";

  return (
    <Badge variant={variant}>
      {label}: {score}/10
    </Badge>
  );
}
