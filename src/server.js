import "dotenv/config";

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import twilio from "twilio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;

const twilioCredentialMode = resolveTwilioCredentialMode();

if (!twilioCredentialMode) {
  console.warn(
    "Missing required Twilio credentials. Set TWILIO_ACCOUNT_SID plus either TWILIO_AUTH_TOKEN or TWILIO_API_KEY and TWILIO_API_SECRET. Also set TWILIO_MESSAGING_SERVICE_SID."
  );
}

const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

const twilioClient = createTwilioClient();

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
    const firstMessage = await sendMessage(normalizedPhoneNumber, messageOne);
    await wait(5000);
    const secondMessage = await sendMessage(normalizedPhoneNumber, messageTwo);

    console.log("Demo notifications accepted by Twilio", {
      to: maskPhoneNumber(normalizedPhoneNumber),
      firstMessage: {
        sid: firstMessage.sid,
        status: firstMessage.status
      },
      secondMessage: {
        sid: secondMessage.sid,
        status: secondMessage.status
      }
    });

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
    messagingServiceSid,
    to
  });
}

async function wait(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function maskPhoneNumber(phoneNumber) {
  if (phoneNumber.length < 4) {
    return "****";
  }

  return `${phoneNumber.slice(0, 2)}******${phoneNumber.slice(-2)}`;
}

function createTwilioClient() {
  if (twilioCredentialMode === "auth-token") {
    return twilio(accountSid, authToken);
  }

  if (twilioCredentialMode === "api-key") {
    return twilio(apiKey, apiSecret, { accountSid });
  }

  return null;
}

function resolveTwilioCredentialMode() {
  if (accountSid && messagingServiceSid && authToken) {
    return "auth-token";
  }

  if (accountSid && messagingServiceSid && apiKey && apiSecret) {
    return "api-key";
  }

  return null;
}
