export interface SheetLeadRow {
  rowNumber: number;
  record: Record<string, string>;
}

const DEFAULT_COUNTRY_COLUMN_PATTERN = /country|region|market/i;
const DEFAULT_PH_VALUES = ["philippines", "ph", "phl", "phil", "philippine"];

function resolveCountryColumnIndex(headers: string[]): number {
  const configured = process.env.PH_COUNTRY_COLUMN;
  if (configured) {
    const idx = headers.findIndex(
      (h) => h.trim().toLowerCase() === configured.trim().toLowerCase(),
    );
    if (idx !== -1) return idx;
  }
  return headers.findIndex((h) => DEFAULT_COUNTRY_COLUMN_PATTERN.test(h));
}

function resolvePhValues(): string[] {
  const configured = process.env.PH_MATCH_VALUES;
  const values = configured
    ? configured.split(",").map((v) => v.trim().toLowerCase())
    : DEFAULT_PH_VALUES;
  return values.filter(Boolean);
}

/**
 * Scans sheet rows (row 0 = header) for Philippines-tagged leads added after
 * `sinceRowNumber` (1-indexed, matching the sheet's own row numbers).
 */
export function findNewPhLeads(
  rows: string[][],
  sinceRowNumber: number,
): SheetLeadRow[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => (h ?? "").trim());
  const countryIdx = resolveCountryColumnIndex(headers);
  if (countryIdx === -1) {
    throw new Error(
      `Could not find a country/region column in the sheet headers: [${headers.join(", ")}]. Set PH_COUNTRY_COLUMN to the exact header name.`,
    );
  }
  const phValues = resolvePhValues();

  const results: SheetLeadRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const rowNumber = i + 1; // sheet rows are 1-indexed; row 1 is the header
    if (rowNumber <= sinceRowNumber) continue;

    const row = rows[i] ?? [];
    const countryValue = (row[countryIdx] ?? "").trim().toLowerCase();
    if (!countryValue || !phValues.some((v) => countryValue.includes(v))) {
      continue;
    }

    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (header) record[header] = row[idx] ?? "";
    });
    results.push({ rowNumber, record });
  }
  return results;
}

export function guessName(record: Record<string, string>): string | null {
  const key = Object.keys(record).find((k) =>
    /^name$|full ?name|lead ?name|contact ?name/i.test(k),
  );
  return (key && record[key]) || null;
}

export function guessContact(record: Record<string, string>): string | null {
  const key = Object.keys(record).find((k) => /email|phone|contact|number/i.test(k));
  return (key && record[key]) || null;
}

export function guessCountry(record: Record<string, string>): string | null {
  const headers = Object.keys(record);
  const idx = resolveCountryColumnIndex(headers);
  return idx === -1 ? null : record[headers[idx]] || null;
}
