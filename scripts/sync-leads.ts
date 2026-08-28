// Manual/local runner for the sheet sync — same logic the deployed cron and
// the dashboard's "Sync now" button use. Handy for testing the Google
// Sheets/Slack/email pipeline before wiring up Netlify's schedule.
import "dotenv/config";
import { syncLeads } from "../src/lib/sync";

syncLeads()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.errors.length > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
