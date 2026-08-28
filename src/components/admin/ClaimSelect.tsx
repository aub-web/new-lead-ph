"use client";

import { useTransition } from "react";
import { claimLead } from "@/lib/actions/lead-actions";
import { ROSTER } from "@/lib/roster";

export default function ClaimSelect({
  leadId,
  claimedBy,
}: {
  leadId: string;
  claimedBy: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={claimedBy ?? ""}
      disabled={isPending}
      onChange={(event) => {
        const value = event.target.value || null;
        startTransition(async () => {
          await claimLead(leadId, value);
        });
      }}
      className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 disabled:opacity-50"
    >
      <option value="">Unclaimed</option>
      {ROSTER.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
