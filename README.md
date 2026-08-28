# New Lead PH

Watches the [global leads Google Sheet](https://docs.google.com/spreadsheets/d/1XjVc5buQ_FW_XObI4dSBWxN3HxTxSoWEpm4gXpCDnMI/edit)
for new Philippines-tagged rows and notifies the Philippines team via a
message in the `#new-lead-ph` Slack channel, email, and a live in-app
dashboard.

Built with Next.js (App Router), TypeScript, Tailwind CSS, and Prisma on
Postgres (Neon) — same stack as Atlas Capture's other internal tools.

## How it works

1. `src/lib/sheets.ts` reads the sheet via the Google Sheets API, authorized
   as a real Google account (read-only) via OAuth — see
   `src/lib/google-oauth-setup.ts` and the one-time `/api/admin/google-oauth`
   flow. (A service account would normally be used here instead, but Atlas
   Capture's Google Workspace org policy blocks service account key
   creation, so this app authorizes as a person instead — any account
   already invited to the sheet works, no sharing step needed.)
2. `src/lib/leads.ts` filters rows by the country/region column for
   Philippines values, keeping only rows added since the last check
   (`SyncState.lastRowNumber` in the DB).
3. `src/lib/notify.ts` posts to the `#new-lead-ph` Slack channel (via an
   Incoming Webhook, pinging `@channel` so it's not missed) and sends an
   email (Resend) for each new lead.
4. `src/lib/sync.ts` ties it together and is idempotent — `Lead.rowNumber` is
   unique, so re-running never double-notifies.
5. `/admin` lists every Philippines lead ever seen, with badges showing
   whether Slack/email notification succeeded, and a "Sync now" button.
   Signing in requires "Sign in with Slack" (`src/lib/slack-oauth.ts`), and
   only emails in `ALLOWED_EMAILS` are let in.
6. `netlify/functions/sync-leads.ts` calls `/api/cron/sync` every 5 minutes
   (schedule set in `netlify.toml`) to check the sheet automatically.

## Getting started

```bash
npm install
npx prisma migrate dev   # applies the schema to your Postgres database
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) and sign in
with Slack.

To test the sheet → Slack/email pipeline without waiting for the cron:

```bash
npm run sync:leads
```

## Environment variables

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` / `DIRECT_DATABASE_URL` — Neon Postgres connection strings
  (pooled and direct — see comments in `.env.example`).
- `CRON_SECRET` — shared secret the scheduled sync uses to call
  `/api/cron/sync`.
- `SESSION_SECRET` — signs the `/admin` session cookie.
- `ALLOWED_EMAILS` — the only people who can sign in to `/admin`.
  Comma-separated. (Who gets Slack-notified is controlled separately by who's
  in the `#new-lead-ph` channel — see `SLACK_WEBHOOK_URL` below.)
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` — from Google Cloud
  Console → APIs & Services → Credentials → Create Credentials → OAuth
  client ID → Web application. Add
  `<your-deploy-url>/api/admin/google-oauth/callback` (and the localhost
  equivalent) as an authorized redirect URI. Requires the Google Sheets API
  to be enabled on the project.
- `GOOGLE_OAUTH_REFRESH_TOKEN` — leave blank at first. After deploying with
  the two vars above set, sign in to `/admin` and visit
  `/api/admin/google-oauth`. Sign in with a Google account that already has
  Viewer (or better) access to the lead sheet; the callback page shows a
  refresh token — paste it in as this var and redeploy. This step only needs
  to be repeated if the token is ever revoked.
- `GOOGLE_SHEET_ID` — already set to the global leads sheet.
- `GOOGLE_SHEET_RANGE` — which tab/columns to read, e.g. `Sheet1!A:Z`.
- `PH_COUNTRY_COLUMN` — exact header text of the country/region column (the
  app guesses if unset).
- `PH_MATCH_VALUES` — comma-separated values that count as Philippines.
- `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` — "Sign in with Slack" (OpenID
  Connect) credentials for the `/admin` login. Set up in your Slack app at
  [api.slack.com/apps](https://api.slack.com/apps): enable "Sign In with
  Slack" and add both `http://localhost:3000/api/auth/slack/callback` and
  your production callback URL (e.g.
  `https://your-site.netlify.app/api/auth/slack/callback`) as Redirect URLs.
- `SLACK_WEBHOOK_URL` — an Incoming Webhook for the `#new-lead-ph` channel
  (same Slack app's Incoming Webhooks page → Add New Webhook to Workspace →
  pick `#new-lead-ph`). Add everyone who should be notified to that channel;
  every message pings `@channel`.
- `RESEND_API_KEY` / `EMAIL_FROM` / `EMAIL_RECIPIENTS` — email alerts via
  [Resend](https://resend.com).

Any notification channel left unconfigured is silently skipped (e.g. no
`RESEND_API_KEY` just means no emails — Slack and the dashboard still
work).

## Deploying (Netlify)

1. Push this repo to GitHub and connect it in Netlify.
2. Set all the env vars above in Site settings → Environment variables.
3. Add the production callback URL
   (`https://<your-site>.netlify.app/api/auth/slack/callback`) as a Redirect
   URL in the Slack app's "Sign In with Slack" settings.
4. Netlify's build runs `prisma migrate deploy && next build` (see
   `netlify.toml`) and picks up `netlify/functions/sync-leads.ts` as a
   scheduled function automatically.

## Project structure

- `src/app/admin/` — dashboard listing Philippines leads (Slack sign-in
  required).
- `src/app/api/auth/slack/` — "Sign in with Slack" start + OAuth callback.
- `src/app/api/auth/logout/route.ts` — clears the session cookie.
- `src/app/api/cron/sync/route.ts` — sync endpoint called by the scheduled
  function (secret-protected).
- `src/app/api/admin/sync/route.ts` — sync endpoint for the dashboard's
  "Sync now" button (session-protected).
- `src/app/api/admin/google-oauth/` — one-time "connect Google Sheets" flow.
- `src/lib/sheets.ts` — Google Sheets API client (uses the refresh token).
- `src/lib/google-oauth-setup.ts` — the one-time OAuth flow's exchange logic.
- `src/lib/leads.ts` — Philippines-row filtering.
- `src/lib/notify.ts` — Slack channel + email notifications.
- `src/lib/slack-oauth.ts` — "Sign in with Slack" OpenID Connect flow.
- `src/lib/allowed-emails.ts` — the shared allowlist.
- `src/lib/sync.ts` — orchestrates the above and updates the DB.
- `src/proxy.ts` — protects `/admin/*` pages and `/api/admin/*` routes.
