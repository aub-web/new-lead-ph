import { OAuth2Client } from "google-auth-library";

let authClient: OAuth2Client | null = null;

function getAuthClient(): OAuth2Client {
  if (authClient) return authClient;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN must be set. Visit /api/admin/google-oauth to generate a refresh token.",
    );
  }

  authClient = new OAuth2Client({ clientId, clientSecret });
  authClient.setCredentials({ refresh_token: refreshToken });
  return authClient;
}

/**
 * The global team periodically rotates to a new tab (e.g. "Aug 27 -
 * Current") and archives the old one (e.g. "Before Aug 27") rather than
 * appending forever to one tab. Instead of a fixed tab name, find whichever
 * tab's title contains GOOGLE_SHEET_TAB_MATCH (default "current",
 * case-insensitive) — the leftmost/lowest-index match wins if there's more
 * than one.
 */
export async function resolveActiveTabTitle(): Promise<string> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID is not set.");
  const tabMatch = (process.env.GOOGLE_SHEET_TAB_MATCH ?? "current").toLowerCase();

  const client = getAuthClient();
  const res = await client.request<{
    sheets?: { properties?: { title?: string; index?: number } }[];
  }>({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
  });

  const tabs = (res.data.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title));
  const match = tabs.find((title) => title.toLowerCase().includes(tabMatch));

  if (!match) {
    throw new Error(
      `No tab title contains "${tabMatch}" (tabs found: ${tabs.join(", ") || "none"}). Set GOOGLE_SHEET_TAB_MATCH to match the active tab's name.`,
    );
  }
  return match;
}

/** Fetches every row of the given tab (columns from GOOGLE_SHEET_COLUMN_RANGE, default A:Z), including the header row. */
export async function fetchSheetRows(tabTitle: string): Promise<string[][]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID is not set.");
  const columnRange = process.env.GOOGLE_SHEET_COLUMN_RANGE ?? "A:Z";
  // Sheet titles containing spaces or punctuation (e.g. "Aug 27 - Current")
  // must be single-quoted in A1 notation range strings.
  const range = `'${tabTitle.replace(/'/g, "''")}'!${columnRange}`;

  const client = getAuthClient();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;

  const res = await client.request<{ values?: string[][] }>({ url });
  return res.data.values ?? [];
}
