import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/auth";

// Lead data changes on its own schedule (the cron sync) and via the manual
// "Sync now" button — never serve a cached response.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = await getSessionEmail();
  if (!email) {
    redirect("/admin/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 sm:px-8">
        <div>
          <p className="text-sm font-semibold text-zinc-900">New Lead PH</p>
          <p className="text-xs text-zinc-500">
            Philippines lead alerts from the global leads sheet
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{email}</span>
          <a
            href="/api/auth/logout"
            className="rounded-lg px-3 py-1.5 font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            Log out
          </a>
        </div>
      </header>
      <main className="min-w-0 flex-1 overflow-x-auto px-4 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
