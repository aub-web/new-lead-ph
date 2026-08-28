import { NextResponse, type NextRequest } from "next/server";
import { isEmailAllowed } from "@/lib/allowed-emails";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { exchangeSlackCode } from "@/lib/slack-oauth";
import { STATE_COOKIE } from "@/app/api/auth/slack/route";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  function redirectWithError(error: string) {
    const response = NextResponse.redirect(new URL(`/admin/login?error=${error}`, request.url));
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  if (oauthError) return redirectWithError("slack_error");
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError("invalid_state");
  }

  const redirectUri = new URL("/api/auth/slack/callback", request.url).toString();

  let email: string;
  try {
    ({ email } = await exchangeSlackCode(code, redirectUri));
  } catch (err) {
    console.error("Slack sign-in failed:", err);
    return redirectWithError("slack_error");
  }

  if (!isEmailAllowed(email)) {
    return redirectWithError("not_allowed");
  }

  const token = await createSessionToken(email);
  const response = NextResponse.redirect(new URL("/admin", request.url));
  response.cookies.delete(STATE_COOKIE);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
