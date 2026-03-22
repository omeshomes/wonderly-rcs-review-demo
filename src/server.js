import "dotenv/config";

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import twilio from "twilio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

const requiredEnvVars = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_MESSAGING_SERVICE_SID"
];

const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length > 0) {
  console.warn(
    `Missing required environment variables: ${missingEnvVars.join(", ")}. Twilio sends will fail until they are set.`
  );
}

const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const twilioClient =
  missingEnvVars.length === 0
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const dailySubmissionCounts = new Map();

const messageOne = `🔔 New Lead Alert — Wonderly

A new lead just came in:
Name: Jane Smith
Source: Google Ads
Interest: Kitchen Remodel

Open Wonderly to respond before it goes cold.`;

const messageTwo = `⏰ Lead Needs Attention — Wonderly

Jane Smith (Kitchen Remodel) hasn't been contacted in 2 hours.

Tap to open Wonderly and follow up now.`;

app.disable("x-powered-by");
app.use(express.json());
app.use((_, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.use(express.static(publicDir));

app.get("/health", (_, response) => {
  response.json({ ok: true });
});

app.post("/api/send-test-notifications", async (request, response) => {
  const normalizedPhoneNumber = normalizeUsPhoneNumber(request.body?.phoneNumber);

  if (!normalizedPhoneNumber) {
    response.status(400).json({ error: "Enter a valid US phone number." });
    return;
  }

  if (!twilioClient) {
    response.status(500).json({ error: "The demo is not configured yet. Please try again later." });
    return;
  }

  pruneExpiredRateLimitEntries();

  const today = currentUtcDate();
  const entry = dailySubmissionCounts.get(normalizedPhoneNumber);

  if (entry?.date === today && entry.count >= 3) {
    response
      .status(429)
      .json({ error: "This phone number has already requested 3 demo sends today. Please try again tomorrow." });
    return;
  }

  const nextCount = entry?.date === today ? entry.count + 1 : 1;
  dailySubmissionCounts.set(normalizedPhoneNumber, { date: today, count: nextCount });

  try {
    await sendMessage(normalizedPhoneNumber, messageOne);
    await wait(5000);
    await sendMessage(normalizedPhoneNumber, messageTwo);

    response.json({ ok: true });
  } catch (error) {
    console.error("Failed to send demo notifications", {
      error,
      phoneNumber: normalizedPhoneNumber
    });

    response.status(502).json({ error: "We couldn't send the test notifications. Please try again." });
  }
});

app.listen(port, host, () => {
  console.log(`Wonderly RCS review demo listening on http://${host}:${port}`);
});

function currentUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeUsPhoneNumber(value) {
  if (typeof value !== "string") {
    return null;
  }

  const phoneNumber = parsePhoneNumberFromString(value, "US");

  if (!phoneNumber?.isValid() || phoneNumber.country !== "US") {
    return null;
  }

  return phoneNumber.number;
}

function pruneExpiredRateLimitEntries() {
  const today = currentUtcDate();

  for (const [phoneNumber, entry] of dailySubmissionCounts.entries()) {
    if (entry.date !== today) {
      dailySubmissionCounts.delete(phoneNumber);
    }
  }
}

async function sendMessage(to, body) {
  return await twilioClient.messages.create({
    body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    to
  });
}

async function wait(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
