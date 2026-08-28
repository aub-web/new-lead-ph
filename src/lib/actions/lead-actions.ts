"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/auth";
import { ROSTER } from "@/lib/roster";

export async function claimLead(leadId: string, claimedBy: string | null): Promise<void> {
  const email = await getSessionEmail();
  if (!email) throw new Error("Unauthorized");

  if (claimedBy !== null && !ROSTER.includes(claimedBy as (typeof ROSTER)[number])) {
    throw new Error("Invalid roster name.");
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { claimedBy },
  });

  revalidatePath("/admin");
}
