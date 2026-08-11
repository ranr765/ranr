import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import { request } from "./http-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function setup() {
  console.log("=== Gmail API Setup ===\n");

  // Step 1: Check for credentials.json
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.log("No credentials.json found.\n");
    console.log("To set up Gmail access, follow these steps:\n");
    console.log("1. Go to https://console.cloud.google.com/apis/credentials");
    console.log("2. Create a new project (or select an existing one)");
    console.log('3. Enable the Gmail API under "APIs & Services > Library"');
    console.log('4. Create OAuth 2.0 credentials (type: "Desktop app")');
    console.log("5. Download the credentials JSON file");
    console.log(`6. Save it as: ${CREDENTIALS_PATH}\n`);
    console.log("Then run this setup script again.");
    process.exit(1);
  }

  // Step 2: Load credentials
  const content = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
  const credentials = JSON.parse(content);
  const { client_id, client_secret, redirect_uris } =
    credentials.installed || credentials.web;

  const redirectUri = redirect_uris?.[0] || "urn:ietf:wg:oauth:2.0:oob";

  // Step 3: Generate auth URL
  const authParams = new URLSearchParams({
    client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams}`;

  console.log("Open this URL in your browser to authorize access:\n");
  console.log(authUrl);
  console.log("");

  // Step 4: Get the authorization code
  const code = await prompt("Enter the authorization code: ");

  // Step 5: Exchange the code for tokens
  const res = await request("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id,
      client_secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (res.statusCode !== 200) {
    throw new Error(`Token exchange failed: ${JSON.stringify(res.body)}`);
  }

  const tokens = res.body;

  // Step 6: Save tokens
  const tokenData = {
    type: "authorized_user",
    client_id,
    client_secret,
    refresh_token: tokens.refresh_token,
  };

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
  console.log(`\nCredentials saved to ${TOKEN_PATH}`);
  console.log("Setup complete! You can now run: npm start");
}

setup().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
