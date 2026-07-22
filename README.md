# VeinzFlow

VeinzFlow is the research-operations system for a four-person vein research project. Team members send Telegram text, links, captions, documents, or short voice notes. The app transcribes voice, extracts a validated project update, safely writes contacts/resources/tasks/logs to Notion, sends a concise Telegram receipt, and emails a project digest every two calendar days.

## Architecture

```text
Telegram → signed Next.js webhook → authorization and limits
         → optional OpenAI transcription
         → OpenAI or Anthropic extraction → Zod validation
         → deduplication → deterministic Notion mappings → receipt

Vercel daily cron → two-day due check → Notion collection
                  → OpenAI or Anthropic digest (deterministic fallback)
                  → Gmail or Resend → successful-send timestamp
```

Notion is the source of truth. No production database or queue is required in version 1. Raw audio is processed in memory and is not retained.

## Requirements

- Node.js 20.17 or newer (Node 22 LTS is recommended)
- npm 10 or newer
- A Notion workspace and internal integration
- A Telegram bot
- An OpenAI API key; Anthropic is optional
- Gmail OAuth credentials or a Resend account
- A Vercel account for production

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

PowerShell equivalent:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. `/api/health` reports only safe configuration booleans and selected provider names. It never exposes secrets or project content.

## Notion integration setup

1. Create an empty Notion page named **VeinzFlow**.
2. Create an internal integration in [Notion integrations](https://www.notion.so/profile/integrations), copy its secret, and set `NOTION_TOKEN` in `.env.local`.
3. Open the VeinzFlow page, use **Connections**, and add the integration.
4. Copy the page ID from the page URL and set `NOTION_PARENT_PAGE_ID`.
5. Run:

   ```bash
   npm run setup:notion
   ```

The safely repeatable script creates Contacts, Resources, Tasks and Questions, Project Log, and System State data sources plus relations and home-page guidance. It prints five IDs. Copy them into the matching `NOTION_*_DATABASE_ID` variables in `.env.local`; despite the legacy variable names, these values are Notion data-source IDs under the current API.

Notion’s API cannot create every preferred linked-database view. In the Notion UI, optionally add linked views for overdue tasks, upcoming follow-ups, and recent log entries to the parent page.

## Telegram bot setup

1. Chat with [@BotFather](https://t.me/BotFather), run `/newbot`, and set the returned token as `TELEGRAM_BOT_TOKEN`.
2. Generate a random 32+ character value for `TELEGRAM_WEBHOOK_SECRET`. Telegram sends it in `X-Telegram-Bot-Api-Secret-Token`; VeinzFlow checks it with a constant-time comparison.
3. Message the bot once. During initial ID discovery, call `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` locally in a browser or API client. Read `message.from.id` and `message.chat.id`; never commit or post the token.
4. Add each person to `TEAM_MEMBERS_JSON` and allowed chats to comma-separated `ALLOWED_TELEGRAM_CHAT_IDS`:

   ```env
   TEAM_MEMBERS_JSON=[{"name":"Chu","telegramUserId":"123456789","notionUserId":"notion-user-id","email":"person@example.com","aliases":["Chu"]}]
   ALLOWED_TELEGRAM_CHAT_IDS=123456789,-1001234567890
   ```

5. Set `APP_URL` to the public HTTPS URL and run `npm run telegram:register`. Remove the webhook with `npm run telegram:delete-webhook`.

Telegram’s official [Bot API documentation](https://core.telegram.org/bots/api#setwebhook) describes webhook registration and secret tokens.

## AI providers

Create an OpenAI API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys) and set `OPENAI_API_KEY`. The default models are configurable in `.env.local`. OpenAI transcription is required for voice in version 1.

Anthropic is optional. Create a key in the Anthropic Console, set `ANTHROPIC_API_KEY`, then switch either role independently:

```env
EXTRACTION_PROVIDER=anthropic
DIGEST_PROVIDER=anthropic
```

Switch back to `openai` without changing Telegram, Notion, validation, or orchestration code. `TRANSCRIPTION_PROVIDER` currently supports only `openai`.

## Gmail setup

1. Create a Google Cloud project and enable the Gmail API.
2. Configure the OAuth consent screen and add the sending Google account as a test user when the app is in testing mode.
3. Create a **Web application** OAuth client.
4. Obtain offline consent using the `https://www.googleapis.com/auth/gmail.send` scope and exchange the authorization code for a refresh token. Google’s [OAuth web-server guide](https://developers.google.com/identity/protocols/oauth2/web-server) documents the flow; an OAuth client tool may be used during setup if its redirect URL is registered.
5. Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, and `GMAIL_SENDER_EMAIL`. Keep `EMAIL_PROVIDER=gmail`.

VeinzFlow creates an RFC-compatible MIME message, base64url-encodes it, and calls Gmail’s official [`users.messages.send`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send) endpoint.

## Resend alternative

Verify a sender/domain in [Resend](https://resend.com), then configure:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=VeinzFlow <updates@example.com>
```

All recipients always come from `TEAM_MEMBERS_JSON`.

## Environment variables

`.env.example` is the authoritative inventory. Important groups are app URL/timezone; Telegram authorization; team mappings; Notion tokens and data-source IDs; provider selection/model names; Gmail or Resend credentials; `CRON_SECRET`; `ADMIN_SECRET`; and input/AI attempt limits. Run this after configuration:

```bash
npm run env:verify
```

Validation is provider-aware: only credentials needed by the selected extraction, digest, and email providers are required. Never paste secrets into chat or tracked files.

## Running and testing locally

```bash
npm run dev
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

The authenticated extraction diagnostic accepts `POST /api/admin/test-extraction` with `Authorization: Bearer $ADMIN_SECRET` and JSON `{ "text": "..." }`. It validates extraction only and does not write to Notion.

To seed clearly marked demo records after Notion setup:

```bash
npm run seed:demo
```

## Testing Telegram locally

Telegram needs a public HTTPS endpoint. Run `npm run dev`, expose port 3000 with a reputable tunnel such as Cloudflare Tunnel or ngrok, set `APP_URL` to that temporary HTTPS origin, and run `npm run telegram:register`. Delete or replace the temporary webhook when finished. Do not expose the admin route without a strong `ADMIN_SECRET`.

For ID diagnostics before webhook registration, use `getUpdates`. Telegram will not allow `getUpdates` while a webhook is active.

## Deploying to Vercel

1. Import the existing GitHub repository into Vercel as a Next.js project.
2. Add every production value from `.env.example` in **Project Settings → Environment Variables**. Use production URLs and strong random values for `CRON_SECRET`, `ADMIN_SECRET`, and `TELEGRAM_WEBHOOK_SECRET`.
3. Deploy. Set `APP_URL` to the production origin and redeploy if needed.
4. Run `npm run telegram:register` from a trusted local terminal using the production values.
5. Open `/api/health`, send a Telegram test message, confirm the Notion records and receipt, then test the digest endpoint with an authenticated request.

`vercel.json` registers `/api/cron/digest` daily at 15:00 UTC. Vercel automatically sends `Authorization: Bearer $CRON_SECRET`; see [Vercel cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs). The route sends only when two calendar days have elapsed in `APP_TIMEZONE` since the last successful send.

Local digest test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/digest
```

## Operations and troubleshooting

- **401 webhook:** confirm the registered webhook secret exactly matches `TELEGRAM_WEBHOOK_SECRET`.
- **403 webhook:** add the sender’s Telegram user ID and chat ID to the allowlists.
- **No voice transcription:** check the OpenAI key, audio size/duration, and supported Telegram metadata.
- **Notion validation error:** rerun `setup:notion`, use the printed data-source IDs, and confirm the integration still has page access.
- **Unassigned task:** expected when an alias is missing or ambiguous. Add a unique alias; VeinzFlow deliberately does not guess.
- **Digest says `not_due`:** fewer than two local calendar days have elapsed since the recorded successful send.
- **Gmail 401:** refresh token may be revoked or was issued without offline access and `gmail.send`.
- **Partial write:** inspect Vercel logs and the Telegram receipt. Completed records remain; source IDs prevent duplicate tasks/logs when retried.

## Security

Webhook, cron, and admin endpoints are authenticated. Telegram senders/chats are allowlisted and rate-limited. Input size/type is bounded. Telegram downloads are HTTPS-only from the expected host with validated file paths. AI output passes Zod and business rules before deterministic mapping. Notion calls use bounded retries. Logs redact likely secrets and avoid full message content. Stack traces are not returned. `.env*` is ignored except `.env.example`; secrets never belong in Notion. Raw audio is not retained.

Use separate production credentials, rotate exposed credentials immediately, keep access to the Notion parent page narrow, and review Vercel and provider logs regularly.

## Cost, backup, and recovery

For four people sending short notes, normal costs should fit Vercel Hobby, Notion Free, Telegram’s API, and Gmail or Resend’s free allowance; AI usage depends on audio length and model choices. Limits in `.env` prevent unexpectedly large submissions. Review provider pricing before production because prices and free tiers change.

Notion is the backup boundary: export the VeinzFlow page regularly as Markdown/CSV and retain exports outside Notion. Keep source code in GitHub and protected settings documented in a password manager. Recovery is: redeploy the repository, restore environment variables, share the Notion page with a replacement integration, rerun the idempotent setup, and register the Telegram webhook again.

## Known limitations

- Processing is synchronous; short team notes are the intended workload. A durable queue is the next scaling step.
- OpenAI is the only transcription provider in version 1.
- Arbitrary PDF/document contents are not parsed; only basic metadata/captions are captured.
- Notion API views require a small optional manual layout step.
- Contact/resource linking is conservative, and task semantic deduplication intentionally avoids aggressive guesses.
- System State prevents ordinary duplicate delivery but is not a distributed lock against simultaneous cron invocations.
