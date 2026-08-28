// The sheet's own `created_at` column reflects when the lead actually came
// in, which is what the date filter should go by — not `createdAt`, which
// for backfilled leads is just whenever this app happened to first scan
// that tab. Falls back to `createdAt` if the sheet's value is missing or
// unparseable (e.g. an unrelated column layout on some future tab).
export function getLeadDate(lead: { data: unknown; createdAt: Date }): Date {
  const record = lead.data as Record<string, string> | null;
  const raw = record?.created_at;
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return lead.createdAt;
}

/** Local YYYY-MM-DD — avoids the UTC-shift bugs toISOString() has near midnight. */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
