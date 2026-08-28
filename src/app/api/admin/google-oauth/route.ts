import { NextResponse, type NextRequest } from "next/server";
import { buildGoogleAuthorizeUrl } from "@/lib/google-oauth-setup";

export const GOOGLE_OAUTH_STATE_COOKIE = "nlph_google_oauth_state";

// One-time setup: visit this while signed in to /admin to connect a Google
// account (one that already has Viewer access to the lead sheet) and get a
// refresh token for GOOGLE_OAUTH_REFRESH_TOKEN. Protected by the same
// session check as the rest of /api/admin/* (see src/proxy.ts).
export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/admin/google-oauth/callback", request.url).toString();

  let authorizeUrl: string;
  try {
    authorizeUrl = buildGoogleAuthorizeUrl(redirectUri, state);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
