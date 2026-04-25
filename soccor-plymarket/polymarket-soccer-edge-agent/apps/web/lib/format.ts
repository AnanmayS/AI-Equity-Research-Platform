export function percent(value?: number | null) {
  if (value === undefined || value === null) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

export function money(value?: number | null) {
  if (value === undefined || value === null) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function compact(value?: number | null) {
  if (value === undefined || value === null) return "n/a";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function dateTime(value?: string | null) {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

