import { Resend } from "resend";
import { guessContact, guessName, type SheetLeadRow } from "@/lib/leads";

function formatLeadLines(row: SheetLeadRow): string {
  return Object.entries(row.record)
    .filter(([, value]) => value)
    .map(([key, value]) => `*${key}:* ${value}`)
    .join("\n");
}

// Posts to the #new-lead-ph channel via an Incoming Webhook. `<!channel>`
// pings everyone in the channel regardless of their notification
// preferences, since a plain post can otherwise go unnoticed.
export async function notifySlack(row: SheetLeadRow): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const name = guessName(row.record) ?? "New lead";
  const text = `<!channel> :flag-ph: *New Philippines lead* — ${name} (sheet row ${row.rowNumber})\n${formatLeadLines(row)}`;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook failed: ${res.status} ${await res.text()}`);
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
