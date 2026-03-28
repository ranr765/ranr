import { request } from "./http-client.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Summarize a batch of emails using Claude, extracting key events and action items.
 */
export async function summarizeEmails(emails) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required.");
  }

  if (emails.length === 0) {
    return {
      summary: "No emails found in the specified time period.",
      keyEvents: [],
      actionItems: [],
    };
  }

  // Build a structured representation of the emails
  const emailDigest = emails
    .map((email, i) => {
      return [
        `--- Email ${i + 1} ---`,
        `From: ${email.from}`,
        `To: ${email.to}`,
        `Date: ${email.date}`,
        `Subject: ${email.subject}`,
        `Preview: ${email.snippet}`,
        email.body ? `Body:\n${email.body.slice(0, 2000)}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const res = await request(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are an executive assistant analyzing a week's worth of emails. Review the following emails and produce a structured summary.

Your output must be valid JSON with this exact structure:
{
  "summary": "A 2-3 paragraph executive summary of the week's email activity",
  "keyEvents": [
    {
      "title": "Short title of the event",
      "description": "Brief description",
      "date": "Date of the event",
      "category": "meeting|deadline|announcement|request|update|personal|financial|other"
    }
  ],
  "actionItems": [
    {
      "task": "Description of what needs to be done",
      "priority": "high|medium|low",
      "deadline": "Deadline if mentioned, otherwise null",
      "source": "Who/what email this action came from"
    }
  ]
}

Guidelines:
- Group related emails into coherent events
- Prioritize action items by urgency
- Flag any emails that seem time-sensitive
- Ignore spam, promotions, and automated notifications unless they contain important info
- Focus on emails that require human attention or decision-making

Here are the emails from the past week:

${emailDigest}`,
        },
      ],
    }),
  });

  if (res.statusCode !== 200) {
    throw new Error(`Claude API error (${res.statusCode}): ${JSON.stringify(res.body)}`);
  }

  const responseText =
    res.body.content?.[0]?.type === "text" ? res.body.content[0].text : "";

  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    return {
      summary: responseText,
      keyEvents: [],
      actionItems: [],
    };
  }
}

/**
 * Format the summary result into a readable text report.
 */
export function formatReport(result) {
  const lines = [];
  const divider = "=".repeat(60);

  lines.push(divider);
  lines.push("  WEEKLY EMAIL SUMMARY REPORT");
  lines.push(`  Generated: ${new Date().toLocaleString()}`);
  lines.push(divider);

  lines.push("\n## Overview\n");
  lines.push(result.summary);

  if (result.keyEvents && result.keyEvents.length > 0) {
    lines.push(`\n${divider}`);
    lines.push("## Key Events\n");
    result.keyEvents.forEach((event, i) => {
      const badge = `[${event.category?.toUpperCase() || "EVENT"}]`;
      lines.push(`${i + 1}. ${badge} ${event.title}`);
      lines.push(`   ${event.description}`);
      if (event.date) lines.push(`   Date: ${event.date}`);
      lines.push("");
    });
  }

  if (result.actionItems && result.actionItems.length > 0) {
    lines.push(`${divider}`);
    lines.push("## Action Items\n");

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sorted = [...result.actionItems].sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
    );

    sorted.forEach((item, i) => {
      const priorityIcon =
        item.priority === "high"
          ? "[!!!]"
          : item.priority === "medium"
            ? "[!!]"
            : "[!]";
      lines.push(`${i + 1}. ${priorityIcon} ${item.task}`);
      if (item.deadline) lines.push(`   Deadline: ${item.deadline}`);
      lines.push(`   Source: ${item.source}`);
      lines.push("");
    });
  }

  lines.push(divider);
  return lines.join("\n");
}
