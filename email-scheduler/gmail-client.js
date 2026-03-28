import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { request } from "./http-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Load credentials and get a valid access token (refreshing if needed).
 */
async function getAccessToken() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(
      "No saved credentials found. Run `npm run setup` first to authenticate with Gmail."
    );
  }
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error("No credentials.json found. See README for setup instructions.");
  }

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  const { client_id, client_secret } = creds.installed || creds.web;

  // Refresh the access token using the refresh token
  const res = await request(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (res.statusCode !== 200) {
    throw new Error(`Failed to refresh token: ${JSON.stringify(res.body)}`);
  }

  return res.body.access_token;
}

/**
 * Make an authenticated Gmail API request.
 */
async function gmailRequest(endpoint, params = {}) {
  const accessToken = await getAccessToken();
  const query = new URLSearchParams(params).toString();
  const url = `${GMAIL_API}${endpoint}${query ? "?" + query : ""}`;

  const res = await request(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.statusCode !== 200) {
    throw new Error(`Gmail API error (${res.statusCode}): ${JSON.stringify(res.body)}`);
  }

  return res.body;
}

/**
 * Fetch emails from the last N days.
 */
export async function fetchRecentEmails(days = 7, maxResults = 100) {
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - days);
  const afterEpoch = Math.floor(afterDate.getTime() / 1000);

  const q = `after:${afterEpoch}`;
  const listData = await gmailRequest("/messages", {
    q,
    maxResults: String(maxResults),
  });

  const messages = listData.messages || [];
  if (messages.length === 0) return [];

  // Fetch metadata for each message (batched sequentially to avoid rate limits)
  const batchSize = 10;
  const emails = [];

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((msg) =>
        gmailRequest(`/messages/${msg.id}`, {
          format: "metadata",
          metadataHeaders: "Subject,From,Date,To",
        })
      )
    );

    for (const data of results) {
      const headers = data.payload?.headers || [];
      const getHeader = (name) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

      emails.push({
        id: data.id,
        threadId: data.threadId,
        subject: getHeader("Subject"),
        from: getHeader("From"),
        to: getHeader("To"),
        date: getHeader("Date"),
        snippet: data.snippet || "",
        labelIds: data.labelIds || [],
      });
    }
  }

  return emails;
}

/**
 * Get the full body text of a specific email.
 */
export async function getEmailBody(messageId) {
  const data = await gmailRequest(`/messages/${messageId}`, { format: "full" });
  return extractTextFromPayload(data.payload);
}

/**
 * Recursively extract plain text from a Gmail message payload.
 */
function extractTextFromPayload(payload) {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64url").toString("utf-8");
      }
    }
    for (const part of payload.parts) {
      const text = extractTextFromPayload(part);
      if (text) return text;
    }
  }

  return "";
}
