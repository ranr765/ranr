import { fetchRecentEmails, getEmailBody } from "./gmail-client.js";
import { summarizeEmails, formatReport } from "./summarizer.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Main entry point: fetch last week's emails, summarize, and output report.
 */
async function run() {
  const days = parseInt(process.env.EMAIL_LOOKBACK_DAYS || "7", 10);
  const maxEmails = parseInt(process.env.EMAIL_MAX_RESULTS || "100", 10);
  const topN = parseInt(process.env.EMAIL_FETCH_BODY_COUNT || "30", 10);

  console.log(`Fetching emails from the last ${days} days...`);

  const emails = await fetchRecentEmails(days, maxEmails);
  console.log(`Found ${emails.length} emails.`);

  if (emails.length === 0) {
    console.log("No emails to summarize.");
    return;
  }

  // Fetch full body for the most recent/important emails
  // (sorted by date, newest first - they come from the API that way)
  const emailsToEnrich = emails.slice(0, topN);
  console.log(
    `Fetching full content for ${emailsToEnrich.length} most recent emails...`
  );

  for (const email of emailsToEnrich) {
    try {
      email.body = await getEmailBody(email.id);
    } catch (err) {
      console.warn(`Could not fetch body for "${email.subject}": ${err.message}`);
    }
  }

  console.log("Generating summary with Claude...");
  const result = await summarizeEmails(emails);

  // Format and display the report
  const report = formatReport(result);
  console.log("\n" + report);

  // Save report to file
  const reportsDir = path.join(__dirname, "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split("T")[0];
  const reportPath = path.join(reportsDir, `email-summary-${timestamp}.txt`);
  fs.writeFileSync(reportPath, report, "utf-8");
  console.log(`\nReport saved to: ${reportPath}`);

  // Also save the raw JSON
  const jsonPath = path.join(reportsDir, `email-summary-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`Raw JSON saved to: ${jsonPath}`);
}

run().catch((err) => {
  console.error("Error running email summary:", err);
  process.exit(1);
});
