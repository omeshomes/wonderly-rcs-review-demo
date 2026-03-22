# Wonderly RCS Review Demo

Standalone public demo page for carrier reviewers to trigger sample Wonderly lead notification messages via Twilio.

## Local run

```bash
nvm use
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

## Required environment variables

- `TWILIO_ACCOUNT_SID`
- `TWILIO_MESSAGING_SERVICE_SID`
- One of:
- `TWILIO_AUTH_TOKEN`
- Or both `TWILIO_API_KEY` and `TWILIO_API_SECRET`
- `HOST` defaults to `0.0.0.0`
- Node `22.16.0` via `.nvmrc`

## Render deploy

1. Push this folder to its own GitHub repo.
2. Create a new Render Web Service from that repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add `TWILIO_ACCOUNT_SID`, `TWILIO_MESSAGING_SERVICE_SID`, and either `TWILIO_AUTH_TOKEN` or `TWILIO_API_KEY` plus `TWILIO_API_SECRET` in Render.
6. Deploy and open the generated `onrender.com` URL once before sharing it.
