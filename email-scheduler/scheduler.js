import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default: Run every Monday at 8:00 AM
const cronExpr = process.env.EMAIL_CRON_SCHEDULE || "0 8 * * 1";

/**
 * Minimal cron parser & scheduler using only Node.js built-ins.
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 */
function parseCronField(field, min, max) {
  if (field === "*") return null; // matches all
  const values = new Set();

  for (const part of field.split(",")) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    const step = stepMatch ? parseInt(stepMatch[2]) : 1;
    const range = stepMatch ? stepMatch[1] : part;

    if (range === "*") {
      for (let i = min; i <= max; i += step) values.add(i);
    } else if (range.includes("-")) {
      const [start, end] = range.split("-").map(Number);
      for (let i = start; i <= end; i += step) values.add(i);
    } else {
      values.add(parseInt(range));
    }
  }

  return values;
}

function parseCron(expr) {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = expr.trim().split(/\s+/);
  return {
    minute: parseCronField(minute, 0, 59),
    hour: parseCronField(hour, 0, 23),
    dayOfMonth: parseCronField(dayOfMonth, 1, 31),
    month: parseCronField(month, 1, 12),
    dayOfWeek: parseCronField(dayOfWeek, 0, 6),
  };
}

function matchesCron(cron, date) {
  const checks = [
    [cron.minute, date.getMinutes()],
    [cron.hour, date.getHours()],
    [cron.dayOfMonth, date.getDate()],
    [cron.month, date.getMonth() + 1],
    [cron.dayOfWeek, date.getDay()],
  ];
  return checks.every(([allowed, value]) => allowed === null || allowed.has(value));
}

const cron = parseCron(cronExpr);

console.log("Email summary scheduler started.");
console.log(`Schedule: ${cronExpr}`);
console.log("Checking every 60 seconds for schedule match.\n");

// Check every minute if we should run
let lastRunMinute = -1;

setInterval(() => {
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();

  // Only run once per matching minute
  if (currentMinute === lastRunMinute) return;

  if (matchesCron(cron, now)) {
    lastRunMinute = currentMinute;
    const timestamp = now.toLocaleString();
    console.log(`[${timestamp}] Running weekly email summary...`);

    execFile("node", [path.join(__dirname, "index.js")], (error, stdout, stderr) => {
      if (error) {
        console.error(`[${timestamp}] Error:`, error.message);
        if (stderr) console.error(stderr);
        return;
      }
      console.log(stdout);
    });
  }
}, 60_000);
