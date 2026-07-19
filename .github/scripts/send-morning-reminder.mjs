/* Sends the morning inbox reminder as a web-push notification to every opted-in
   device. Run by .github/workflows/daily-notify.yml. Reads two JSON files that
   the workflow produced via `wrangler d1 execute --json`:
     notes.json  — pending inbox notes
     subs.json   — push subscriptions
   Requires env: VAPID_PRIVATE_KEY (secret). VAPID_PUBLIC_KEY / VAPID_SUBJECT
   have safe defaults below. If the private key is absent, it exits quietly. */

import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import webpush from 'web-push'

const PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BFQGMl1wbNlIwEpDxxIMDY8SaUj79z6S8RwuKue0reb7NZEZe1Y0GM4htBiusNQg7_tErYI1S-04kUd_bnv7_II'
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:ranjithvr@gmail.com'

if (!PRIVATE_KEY) {
  console.log('VAPID_PRIVATE_KEY not set — skipping morning reminder (add the secret to enable).')
  process.exit(0)
}

// wrangler d1 execute --json shape varies slightly by version; dig out the rows.
function rowsFrom(file) {
  if (!existsSync(file)) return []
  let parsed
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return []
  }
  const node = Array.isArray(parsed) ? parsed[0] : parsed.result ? parsed.result[0] : parsed
  return (node && node.results) || []
}

const notes = rowsFrom('notes.json')
const subs = rowsFrom('subs.json')

if (!subs.length) {
  console.log('No push subscriptions — nobody to notify.')
  process.exit(0)
}

const count = notes.length
const title = count ? `Good morning 👋 — ${count} in your inbox` : 'Good morning 👋'
const lines = notes.slice(0, 6).map((n) => '• ' + String(n.note || '').replace(/\s+/g, ' ').trim())
if (count > 6) lines.push(`…and ${count - 6} more`)
const body = count
  ? lines.join('\n')
  : 'Inbox is clear. Have a great day of business!'

webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY)
const payload = JSON.stringify({ title, body, url: '/', tag: 'morning-inbox' })

const dead = []
let sent = 0
for (const s of subs) {
  const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
  try {
    await webpush.sendNotification(subscription, payload)
    sent++
  } catch (err) {
    const code = err && err.statusCode
    console.log(`send failed (${code || '?'}) for ${String(s.endpoint).slice(0, 60)}…`)
    if (code === 404 || code === 410) dead.push(s.endpoint)
  }
}
console.log(`Sent ${sent}/${subs.length} notifications. ${count} inbox items.`)

// prune dead subscriptions so the table stays clean
for (const endpoint of dead) {
  const safe = endpoint.replace(/'/g, "''")
  try {
    execSync(
      `npx wrangler@4 d1 execute simple-serve-production --remote --command "DELETE FROM push_subscriptions WHERE endpoint = '${safe}'"`,
      { stdio: 'ignore' }
    )
  } catch { /* best effort */ }
}
if (dead.length) console.log(`Pruned ${dead.length} expired subscription(s).`)
