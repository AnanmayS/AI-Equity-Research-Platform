export function normalizeSupabaseProjectUrl(value: string) {
  const url = new URL(value);
  return url.origin;
}
