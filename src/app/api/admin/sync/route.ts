import { NextResponse } from "next/server";
import { syncLeads } from "@/lib/sync";

// Manual "Sync now" button on the dashboard. Auth is enforced by
// src/proxy.ts (matches /api/admin/:path*), not re-checked here.
export async function POST() {
  try {
    const result = await syncLeads();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
