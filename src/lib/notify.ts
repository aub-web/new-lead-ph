import { Resend } from "resend";
import { getAllowedEmails } from "@/lib/allowed-emails";
import { guessContact, guessName, type SheetLeadRow } from "@/lib/leads";
import { sendSlackDm } from "@/lib/slack";

function formatLeadLines(row: SheetLeadRow): string {
  return Object.entries(row.record)
    .filter(([, value]) => value)
    .map(([key, value]) => `*${key}:* ${value}`)
    .join("\n");
}

// DMs every allowed teammate individually (rather than posting to a shared
// channel) — see src/lib/slack.ts. A partial failure (e.g. one teammate
// isn't in the workspace) is logged but doesn't block the others; only a
// total failure is surfaced as an error.
export async function notifySlack(row: SheetLeadRow): Promise<void> {
  const recipients = getAllowedEmails();
  if (recipients.length === 0) return;

  const name = guessName(row.record) ?? "New lead";
  const text = `:flag-ph: *New Philippines lead* — ${name} (sheet row ${row.rowNumber})\n${formatLeadLines(row)}`;

  const results = await Promise.allSettled(
    recipients.map((email) => sendSlackDm(email, text)),
  );
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`Slack DM to ${recipients[i]} failed:`, result.reason);
    }
  });
  if (results.every((result) => result.status === "rejected")) {
    throw new Error("Slack DM failed for every recipient.");
  }
}

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient ??= new Resend(apiKey);
  return resendClient;
}

export async function notifyEmail(row: SheetLeadRow): Promise<void> {
  const resend = getResend();
  const recipients = (process.env.EMAIL_RECIPIENTS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  if (!resend || recipients.length === 0) return;

  const name = guessName(row.record) ?? "New lead";
  const contact = guessContact(row.record);
  const rowsHtml = Object.entries(row.record)
    .filter(([, value]) => value)
    .map(
      ([key, value]) =>
        `<tr><td style="padding:2px 8px;color:#71717a;">${key}</td><td style="padding:2px 8px;">${value}</td></tr>`,
    )
    .join("");

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "New Lead PH <onboarding@resend.dev>",
    to: recipients,
    subject: `New Philippines lead: ${name}`,
    html: `<h2>New Philippines lead</h2>${contact ? `<p>${contact}</p>` : ""}<table>${rowsHtml}</table>`,
  });
  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }
}
