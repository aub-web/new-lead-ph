import { NextResponse, type NextRequest } from "next/server";
import { syncLeads } from "@/lib/sync";

// Hit by netlify/functions/sync-leads.ts on a schedule (see netlify.toml),
// or by any external cron (cron-job.org, GitHub Actions, etc.) for local/dev
// use. Guarded by a shared secret rather than the admin cookie since the
// caller here isn't a signed-in browser session.
export async function POST(request: NextRequest) {
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
