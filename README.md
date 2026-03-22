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
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID`
- `HOST` defaults to `127.0.0.1` locally and should be `0.0.0.0` on Render
- Node `22.16.0` via `.nvmrc`

## Render deploy

1. Push this folder to its own GitHub repo.
2. Create a new Render Web Service from that repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add the three Twilio environment variables in Render.
6. Deploy and open the generated `onrender.com` URL once before sharing it.
