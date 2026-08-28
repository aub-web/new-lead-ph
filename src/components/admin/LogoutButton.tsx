"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logoutAdmin } from "@/lib/actions/admin-auth-actions";

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await logoutAdmin();
          router.replace("/admin/login");
          router.refresh();
        })
      }
      className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
    >
      Log out
    </button>
  );
}
