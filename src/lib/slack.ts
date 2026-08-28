// Bot-token Slack Web API calls — used to DM each allowed teammate about new
// leads. Distinct from src/lib/slack-oauth.ts, which handles "Sign in with
// Slack" for /admin access.

async function callSlackApi<T extends object>(
  method: string,
  params: Record<string, string>,
): Promise<T> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set.");

  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const data = (await res.json()) as { ok: boolean; error?: string } & T;
  if (!data.ok) {
    throw new Error(`Slack API ${method} failed: ${data.error ?? res.status}`);
  }
  return data;
}

// Slack user IDs for a given email don't change, so caching within a running
// process avoids a lookup call per notification.
const userIdCache = new Map<string, string>();

async function lookupSlackUserId(email: string): Promise<string> {
  const cached = userIdCache.get(email);
  if (cached) return cached;

  const data = await callSlackApi<{ user: { id: string } }>("users.lookupByEmail", {
    email,
  });
  userIdCache.set(email, data.user.id);
  return data.user.id;
}

async function openDmChannel(userId: string): Promise<string> {
  const data = await callSlackApi<{ channel: { id: string } }>("conversations.open", {
    users: userId,
  });
  return data.channel.id;
}

export async function sendSlackDm(email: string, text: string): Promise<void> {
  const userId = await lookupSlackUserId(email);
  const channelId = await openDmChannel(userId);
  await callSlackApi("chat.postMessage", { channel: channelId, text });
}
