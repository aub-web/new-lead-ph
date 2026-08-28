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

/** Fetches every row of the configured sheet/range, including the header row. */
export async function fetchSheetRows(): Promise<string[][]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID is not set.");
  const range = process.env.GOOGLE_SHEET_RANGE ?? "Sheet1!A:Z";

  const client = getAuthClient();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;

  const res = await client.request<{ values?: string[][] }>({ url });
  return res.data.values ?? [];
}
