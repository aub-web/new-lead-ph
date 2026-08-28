import { NextResponse, type NextRequest } from "next/server";
import { exchangeGoogleCode } from "@/lib/google-oauth-setup";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/app/api/admin/google-oauth/route";

function htmlResponse(body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:640px;margin:3rem auto;padding:0 1rem;">${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (oauthError) {
    return htmlResponse(`<h2>Google sign-in cancelled</h2><p>${oauthError}</p>`, 400);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return htmlResponse(
      `<h2>Setup link expired</h2><p>Go back to <a href="/api/admin/google-oauth">/api/admin/google-oauth</a> and try again.</p>`,
      400,
    );
  }

  const redirectUri = new URL("/api/admin/google-oauth/callback", request.url).toString();

  try {
    const { refreshToken } = await exchangeGoogleCode(code, redirectUri);
    const response = htmlResponse(`
      <h2>Google Sheets connected</h2>
      <p>Copy this value into Vercel as <code>GOOGLE_OAUTH_REFRESH_TOKEN</code>, then redeploy. This page won't show it again.</p>
      <textarea readonly style="width:100%;height:4rem;font-family:monospace;font-size:0.9rem;" onclick="this.select()">${refreshToken}</textarea>
    `);
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return htmlResponse(`<h2>Something went wrong</h2><p>${message}</p>`, 500);
  }
}
