import { JWT } from "google-auth-library";

let authClient: JWT | null = null;

function getAuthClient(): JWT {
  if (authClient) return authClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must be set.",
    );
  }

  authClient = new JWT({
    email,
    // .env files can't hold literal newlines, so the key is stored with
    // escaped "\n" sequences and unescaped here.
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
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
