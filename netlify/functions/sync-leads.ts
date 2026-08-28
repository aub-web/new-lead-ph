// Netlify Scheduled Function — cadence is set in netlify.toml
// ([functions."sync-leads"].schedule). Just pokes the app's own
// /api/cron/sync route so all the actual logic lives in the Next.js app
// (see src/lib/sync.ts) instead of being duplicated in the Functions bundle.
export const handler = async () => {
  const secret = process.env.CRON_SECRET;
  const siteUrl = process.env.URL ?? process.env.DEPLOY_PRIME_URL;

  if (!secret || !siteUrl) {
    console.error("sync-leads: CRON_SECRET or site URL not configured; skipping.");
    return { statusCode: 500, body: "Not configured" };
  }

  const res = await fetch(`${siteUrl}/api/cron/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`sync-leads: ${res.status} ${body}`);
  return { statusCode: res.status, body };
};
