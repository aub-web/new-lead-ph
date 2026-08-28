import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** Server-side lookup of the signed-in user's email, or null if not signed
 * in. Re-check this in every admin server action and route handler — never
 * trust that middleware ran first. */
export async function getSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  return session?.email ?? null;
}
