import { prisma } from "@/lib/prisma";
import { fetchSheetRows } from "@/lib/sheets";
import { findNewPhLeads, guessContact, guessCountry, guessName } from "@/lib/leads";
import { notifyEmail, notifySlack } from "@/lib/notify";

export interface SyncResult {
  newLeadsFound: number;
  errors: string[];
}

const SYNC_STATE_ID = "singleton";

/**
 * Pulls the sheet, finds Philippines-tagged rows added since the last sync,
 * records them, and fires Slack/email notifications. Safe to run
 * concurrently/repeatedly — rowNumber is unique, so a row already seen is
 * never re-inserted or re-notified.
 */
export async function syncLeads(): Promise<SyncResult> {
  const errors: string[] = [];

  const state = await prisma.syncState.upsert({
    where: { id: SYNC_STATE_ID },
    update: {},
    create: { id: SYNC_STATE_ID },
  });

  let rows: string[][];
  try {
    rows = await fetchSheetRows();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.syncState.update({
      where: { id: SYNC_STATE_ID },
      data: { lastError: message },
    });
    throw err;
  }

  const newLeads = findNewPhLeads(rows, state.lastRowNumber);
  let highestRowNumber = state.lastRowNumber;

  for (const lead of newLeads) {
    highestRowNumber = Math.max(highestRowNumber, lead.rowNumber);

    const saved = await prisma.lead.upsert({
      where: { rowNumber: lead.rowNumber },
      update: {},
      create: {
        rowNumber: lead.rowNumber,
        name: guessName(lead.record),
        contact: guessContact(lead.record),
        country: guessCountry(lead.record),
        data: lead.record,
      },
    });

    let slackNotifiedAt = saved.slackNotifiedAt;
    let emailNotifiedAt = saved.emailNotifiedAt;

    if (!slackNotifiedAt) {
      try {
        await notifySlack(lead);
        slackNotifiedAt = new Date();
      } catch (err) {
        errors.push(
          `Slack notify failed for row ${lead.rowNumber}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (!emailNotifiedAt) {
      try {
        await notifyEmail(lead);
        emailNotifiedAt = new Date();
      } catch (err) {
        errors.push(
          `Email notify failed for row ${lead.rowNumber}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (slackNotifiedAt !== saved.slackNotifiedAt || emailNotifiedAt !== saved.emailNotifiedAt) {
      await prisma.lead.update({
        where: { id: saved.id },
        data: { slackNotifiedAt, emailNotifiedAt },
      });
    }
  }

  await prisma.syncState.update({
    where: { id: SYNC_STATE_ID },
    data: {
      lastRowNumber: highestRowNumber,
      lastSyncedAt: new Date(),
      lastError: null,
    },
  });

  return { newLeadsFound: newLeads.length, errors };
}
