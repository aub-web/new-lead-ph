import { prisma } from "@/lib/prisma";
import SyncButton from "@/components/admin/SyncButton";

function formatRelative(date: Date): string {
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export default async function AdminDashboardPage() {
  const [leads, state] = await Promise.all([
    prisma.lead.findMany({ orderBy: { rowNumber: "desc" }, take: 100 }),
    prisma.syncState.findUnique({ where: { id: "singleton" } }),
  ]);
  // Server component — runs once per request, so this isn't subject to the
  // re-render instability the purity rule guards against.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3">
        <div className="text-xs text-zinc-500">
          {state ? (
            <>
              Last checked {formatRelative(state.lastSyncedAt)}
              {state.lastError && (
                <span className="ml-2 text-red-600">— {state.lastError}</span>
              )}
            </>
          ) : (
            "Never synced yet"
          )}
        </div>
        <SyncButton />
      </div>

      {leads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
          No Philippines leads yet. New rows tagged Philippines on the sheet
          will show up here.
        </p>
      ) : (
        <ul className="space-y-3">
          {leads.map((lead) => {
            const fields = lead.data as Record<string, string>;
            const isNew = now - lead.createdAt.getTime() < 60 * 60 * 1000;
            return (
              <li key={lead.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900">
                      {lead.name ?? `Row ${lead.rowNumber}`}
                      {isNew && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          New
                        </span>
                      )}
                    </p>
                    {lead.contact && <p className="text-sm text-zinc-500">{lead.contact}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1.5 text-[10px] font-medium uppercase tracking-wide">
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        lead.slackNotifiedAt ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      Slack
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        lead.emailNotifiedAt ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      Email
                    </span>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-zinc-600 sm:grid-cols-2">
                  {Object.entries(fields)
                    .filter(([, value]) => value)
                    .map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <dt className="shrink-0 text-zinc-400">{key}:</dt>
                        <dd className="truncate">{value}</dd>
                      </div>
                    ))}
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
