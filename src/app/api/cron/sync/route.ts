import { NextResponse, type NextRequest } from "next/server";
import { syncLeads } from "@/lib/sync";

// Hit on a schedule by Vercel Cron (see vercel.json — sends GET with
// `Authorization: Bearer $CRON_SECRET` automatically, since Vercel does
// that for any env var literally named CRON_SECRET), or by
// netlify/functions/sync-leads.ts (POST, see netlify.toml) if ever deployed
// there instead. Also usable from any external cron (cron-job.org, GitHub
// Actions, etc.) for more frequent checks than Vercel's plan allows.
// Guarded by a shared secret rather than the admin cookie since the caller
// here isn't a signed-in browser session.
async function handleSync(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncLeads();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = handleSync;
export const POST = handleSync;
