// "Sign in with Slack" (OpenID Connect) — see
// https://api.slack.com/authentication/sign-in-with-slack. Distinct from the
// bot token used in src/lib/slack.ts for sending DMs.

export function buildSlackAuthorizeUrl(redirectUri: string, state: string): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) throw new Error("SLACK_CLIENT_ID is not set.");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "openid,email,profile",
    redirect_uri: redirectUri,
    state,
  });
  return `https://slack.com/openid/connect/authorize?${params.toString()}`;
}

export async function exchangeSlackCode(
  code: string,
  redirectUri: string,
): Promise<{ email: string }> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SLACK_CLIENT_ID and SLACK_CLIENT_SECRET must be set.");
  }

  const tokenRes = await fetch("https://slack.com/api/openid.connect.token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const tokenData = (await tokenRes.json()) as {
    ok?: boolean;
    error?: string;
    access_token?: string;
  };
  if (!tokenRes.ok || tokenData.ok === false || !tokenData.access_token) {
    throw new Error(`Slack token exchange failed: ${tokenData.error ?? tokenRes.status}`);
  }

  const userRes = await fetch("https://slack.com/api/openid.connect.userInfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = (await userRes.json()) as {
    ok?: boolean;
    error?: string;
    email?: string;
  };
  if (!userRes.ok || userData.ok === false || !userData.email) {
    throw new Error(`Slack user info request failed: ${userData.error ?? userRes.status}`);
  }

  return { email: userData.email };
}
