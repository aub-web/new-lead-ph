import { NextResponse, type NextRequest } from "next/server";
import { buildSlackAuthorizeUrl } from "@/lib/slack-oauth";

export const STATE_COOKIE = "nlph_oauth_state";

// Starts "Sign in with Slack" — redirects to Slack, with a short-lived state
// cookie the callback checks to guard against CSRF.
export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/auth/slack/callback", request.url).toString();

  let authorizeUrl: string;
  try {
    authorizeUrl = buildSlackAuthorizeUrl(redirectUri, state);
  } catch {
    return NextResponse.redirect(new URL("/admin/login?error=not_configured", request.url));
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
