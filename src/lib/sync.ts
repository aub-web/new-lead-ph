import { prisma } from "@/lib/prisma";
import { fetchSheetRows, listSheetTabs } from "@/lib/sheets";
import { findNewPhLeads, guessContact, guessCountry, guessName, type SheetLeadRow } from "@/lib/leads";
import { notifyEmail, notifySlack } from "@/lib/notify";

export interface TabSyncResult {
  tabTitle: string;
  newLeadsFound: number;
}

export interface SyncResult {
  tabs: TabSyncResult[];
  newLeadsFound: number;
  errors: string[];
}

async function processLead(tabTitle: string, lead: SheetLeadRow, errors: string[]): Promise<void> {
  const saved = await prisma.lead.upsert({
    where: { tabTitle_rowNumber: { tabTitle, rowNumber: lead.rowNumber } },
    update: {},
    create: {
      tabTitle,
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
        `Slack notify failed for ${tabTitle} row ${lead.rowNumber}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  if (!emailNotifiedAt) {
    try {
      await notifyEmail(lead);
      emailNotifiedAt = new Date();
    } catch (err) {
      errors.push(
        `Email notify failed for ${tabTitle} row ${lead.rowNumber}: ${err instanceof Error ? err.message : err}`,
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

/**
 * Records a pre-existing lead found the first time a tab is watched, so it
 * still shows up on the dashboard — but deliberately never calls
 * notifySlack/notifyEmail, since the team already knows about anything that
 * was already in the sheet before this app started watching.
 */
async function backfillLead(tabTitle: string, lead: SheetLeadRow): Promise<void> {
  await prisma.lead.upsert({
    where: { tabTitle_rowNumber: { tabTitle, rowNumber: lead.rowNumber } },
    update: {},
    create: {
      tabTitle,
      rowNumber: lead.rowNumber,
      name: guessName(lead.record),
      contact: guessContact(lead.record),
      country: guessCountry(lead.record),
      data: lead.record,
      isBackfill: true,
    },
  });
}

/**
 * Syncs one tab: finds Philippines-tagged rows added since that tab's last
 * check and processes them. The first time a tab is seen (no TabSyncState
 * row yet), every existing PH lead in it is backfilled into the dashboard
 * (so nothing already in the sheet looks "missing"), but none of them are
 * notified about — only rows added after this point trigger Slack/email.
 */
async function syncTab(tabTitle: string, errors: string[]): Promise<number> {
  const existing = await prisma.tabSyncState.findUnique({ where: { tabTitle } });
  const isFirstSeen = !existing;

  let rows: string[][];
  try {
    rows = await fetchSheetRows(tabTitle);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.tabSyncState.upsert({
      where: { tabTitle },
      update: { lastError: message },
      create: { tabTitle, lastRowNumber: 0, lastError: message },
    });
    errors.push(`${tabTitle}: ${message}`);
    return 0;
  }

  const sinceRowNumber = isFirstSeen ? 0 : existing.lastRowNumber;
  const leads = findNewPhLeads(rows, sinceRowNumber);

  let newLeadsFound = 0;
  for (const lead of leads) {
    if (isFirstSeen) {
      await backfillLead(tabTitle, lead);
    } else {
      await processLead(tabTitle, lead, errors);
      newLeadsFound++;
    }
  }

  await prisma.tabSyncState.upsert({
    where: { tabTitle },
    update: {
      lastRowNumber: Math.max(sinceRowNumber, rows.length),
      lastSyncedAt: new Date(),
      lastError: null,
    },
    create: {
      tabTitle,
      lastRowNumber: Math.max(sinceRowNumber, rows.length),
      lastError: null,
    },
  });

  return newLeadsFound;
}

/**
 * Syncs every tab in the spreadsheet — the team archives old data into
 * dated tabs rather than keeping one permanent "leads" tab, so there's no
 * single tab that's safe to assume is "the" active one. Safe to run
 * concurrently/repeatedly — Lead's (tabTitle, rowNumber) uniqueness means a
 * row already seen is never re-inserted or re-notified.
 */
export async function syncLeads(): Promise<SyncResult> {
  const errors: string[] = [];
  const tabs = await listSheetTabs();

  const tabResults: TabSyncResult[] = [];
  for (const tabTitle of tabs) {
    const newLeadsFound = await syncTab(tabTitle, errors);
    tabResults.push({ tabTitle, newLeadsFound });
  }

  return {
    tabs: tabResults,
    newLeadsFound: tabResults.reduce((sum, tab) => sum + tab.newLeadsFound, 0),
    errors,
  };
}
