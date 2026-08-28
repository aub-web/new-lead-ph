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
 * The team archives old data into dated tabs (e.g. "Before Aug 27") rather
 * than keeping one permanent "leads" tab, so every tab is watched — see
 * src/lib/sync.ts for how each tab's cursor is tracked independently.
 */
export async function listSheetTabs(): Promise<string[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID is not set.");

  const client = getAuthClient();
  const res = await client.request<{
    sheets?: { properties?: { title?: string } }[];
  }>({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
  });

  return (res.data.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title));
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
