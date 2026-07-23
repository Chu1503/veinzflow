# VeinzFlow

VeinzFlow is a lightweight research-operations system. Team members send Telegram text, links, captions, documents, or short voice notes. The app transcribes voice, extracts a validated project update, safely writes contacts/resources/tasks/logs to Notion, sends a concise Telegram receipt, and emails a project digest every two calendar days.

## Architecture

```text
Telegram → signed Next.js webhook → authorization and limits
         → Groq or OpenAI transcription
         → Gemini, OpenAI, or Anthropic extraction → Zod validation
         → deduplication → deterministic Notion mappings → receipt

Vercel daily cron → deterministic alternate-day check → Notion collection
                  → Gemini, OpenAI, or Anthropic digest (deterministic fallback)
                  → Gmail or Resend
```

Notion is the source of truth. No production database or queue is required in version 1. Raw audio is processed in memory and is not retained.

## Requirements

- Node.js 20.17 or newer (Node 22 LTS is recommended)
- npm 10 or newer
- A Notion workspace and internal integration
- A Telegram bot
- A Groq API key and Gemini API key for the default provider configuration
- Optional OpenAI or Anthropic API keys when selecting those fallback providers
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

The safely repeatable script creates four data sources: Contacts, Resources, Tasks, and Project Log. It prints four IDs. Copy them into the matching `NOTION_*_DATABASE_ID` variables in `.env.local`; despite the legacy variable names, these values are Notion data-source IDs under the current API.

Contacts intentionally has only `Name`, `Contact Details`, `Contact Status`, `Could Help With`, `Expertise`, and `Notes`. `Contact Details` can contain multiple newline-separated emails, phone numbers, profiles, websites, or other ways to make contact. Status is blank or one of `Need to Contact`, `Contacted`, and `Waiting for Response`. Organization, role, meeting context, and miscellaneous useful facts belong in `Notes`.

### Contacts migration

Before upgrading an existing workspace, export or duplicate the Contacts data source as a backup. Rerunning `npm run setup:notion` adds the streamlined properties, removes every other Contacts property, and moves the obsolete internal state data source to Notion trash. Copy any legacy contact data that must be retained into `Contact Details` or `Notes` before running the migration; deleted properties are no longer read by the application. The runtime no longer reads the removed state data source or its environment variable.

Resources contains only `Title`, `Resource Type`, `Link`, `Description`, and `Notes`. Resource Type is `Paper`, `Repo`, or `Other`; legacy authorship, publication, citation, findings, and relevance text is consolidated into Notes.

Tasks contains only `Task`, `Assigned To`, and `Status`. Status is `Not Started`, `In Progress`, `Done`, or `Cancelled`. Useful context is summarized in the task page body rather than separate columns.

Project Log contains only `Title`, `Outcome`, `Date`, `Next Steps`, and `Questions`. Participants, legacy summaries, completed work, decisions, and experiment observations are consolidated into Outcome. The setup migration also removes the generated guidance/footer blocks from the parent Notion page.

Notion’s API cannot create every preferred linked-database view. In the Notion UI, optionally add linked views for active tasks and recent log entries to the parent page.

## Telegram bot setup

1. Chat with [@BotFather](https://t.me/BotFather), run `/newbot`, and set the returned token as `TELEGRAM_BOT_TOKEN`.
2. Generate a random 32+ character value for `TELEGRAM_WEBHOOK_SECRET`. Telegram sends it in `X-Telegram-Bot-Api-Secret-Token`; VeinzFlow checks it with a constant-time comparison.
3. Message the bot once. During initial ID discovery, call `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` locally in a browser or API client. Read `message.from.id` and `message.chat.id`; never commit or post the token.
4. Add each person to `TEAM_MEMBERS_JSON` and allowed chats to comma-separated `ALLOWED_TELEGRAM_CHAT_IDS`:

   ```env
   TEAM_MEMBERS_JSON=[{"name":"Chu","telegramUserId":"123456789","email":"person@example.com","aliases":["Chu"]}]
   ALLOWED_TELEGRAM_CHAT_IDS=123456789,-1001234567890
   ```

5. Set `APP_URL` to the public HTTPS URL and run `npm run telegram:register`. Remove the webhook with `npm run telegram:delete-webhook`.

`notionUserId` remains an optional compatibility fallback. VeinzFlow normally lists workspace users when the Notion client first starts, matches each configured member by email first and display name second, and caches the mapping in memory for 24 hours. Email addresses can also be used directly in task submissions. Unmatched members produce a warning without stopping the app. To refresh immediately, send authenticated `POST /api/admin/refresh-notion-users` with `Authorization: Bearer $ADMIN_SECRET`; the response contains counts only, never emails or IDs.

Telegram’s official [Bot API documentation](https://core.telegram.org/bots/api#setwebhook) describes webhook registration and secret tokens.

### Webhook acknowledgements and idempotency

Once a valid Telegram `update_id` has been identified, VeinzFlow returns HTTP 200 for successful processing and for deliberately handled terminal failures. This prevents Telegram from repeatedly delivering an update after extraction, transcription, authorization, validation, reply, or Notion failures. Invalid webhook secrets remain HTTP 401, and malformed JSON that cannot identify an update remains HTTP 400.

Each running app instance keeps a bounded 24-hour in-memory ledger of attempted and handled `update_id` values. It suppresses concurrent and repeated deliveries to the same warm instance before any Notion write or Telegram reply. Because VeinzFlow intentionally has no production database or queue, this ledger does not survive a cold start and is not shared across simultaneous Vercel instances. Deterministic Notion deduplication remains the secondary cross-instance safeguard: contacts use details/name, resources use link/title, tasks use title, and project-log entries use title plus date. Strong durable exactly-once delivery would require adding persistent infrastructure.

## AI providers

The default provider configuration is:

```env
TRANSCRIPTION_PROVIDER=groq
GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo
EXTRACTION_PROVIDER=gemini
DIGEST_PROVIDER=gemini
GEMINI_EXTRACTION_MODEL=gemini-3.5-flash
GEMINI_DIGEST_MODEL=gemini-3.5-flash
```

### Groq transcription

1. Create an account in the [Groq Console](https://console.groq.com/).
2. Create an API key and place it in `.env.local` as `GROQ_API_KEY`. Do not paste it into chat or commit it.
3. Keep `TRANSCRIPTION_PROVIDER=groq`. The default `whisper-large-v3-turbo` model accepts direct OGG uploads, including supported Telegram OGG/Opus voice notes, so no FFmpeg conversion is required.

Groq free/developer limits, supported formats, and maximum upload sizes can change. VeinzFlow keeps its own 20 MB/10-minute defaults below Groq's documented free-tier file-size ceiling, retries bounded failures, and returns a safe error when rate-limited. Review [Groq speech-to-text documentation](https://console.groq.com/docs/speech-to-text) before production use.

### Gemini extraction and digest

1. Open [Google AI Studio](https://aistudio.google.com/app/apikey), create or select a project, and create a Gemini API key.
2. Store it as `GEMINI_API_KEY` in `.env.local`.
3. Keep `EXTRACTION_PROVIDER=gemini` and `DIGEST_PROVIDER=gemini`.

VeinzFlow uses the current official `@google/genai` SDK and defaults to stable `gemini-3.5-flash`, which supports structured JSON output through the Gemini Developer API and is listed as free-tier eligible where the free tier is available. Model availability, regional eligibility, and request/token limits vary by account and can change; check [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) and [active rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) in AI Studio. Extraction and digest models are independently configurable.

Every Gemini extraction still follows: structured JSON response → JSON parsing → Zod `ProjectUpdate` validation → business rules → deduplication → deterministic Notion mapping. Gemini never builds Notion payloads.

### Optional fallback providers

OpenAI remains available for transcription, extraction, and digest generation. Create a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys), set `OPENAI_API_KEY`, and select the desired roles:

```env
TRANSCRIPTION_PROVIDER=openai
EXTRACTION_PROVIDER=openai
DIGEST_PROVIDER=openai
```

Anthropic remains available for extraction and digests. Create a key in the Anthropic Console, set `ANTHROPIC_API_KEY`, then select:

```env
EXTRACTION_PROVIDER=anthropic
DIGEST_PROVIDER=anthropic
```

Only selected providers require keys. Switching providers does not alter Telegram, Notion, authorization, schemas, deduplication, or orchestration.

### Safe provider testing

- Run `npm run env:verify` to validate selected-provider keys without printing their values.
- Run `npm test`; provider network calls are fully mocked.
- Test Gemini extraction with authenticated `POST /api/admin/test-extraction` and a non-sensitive sample before enabling the Telegram webhook.
- Test Groq with a short, non-sensitive Telegram voice note after webhook registration. Confirm the receipt and delete the test records from Notion if desired.
- Confirm `/api/health` reports the selected providers and `providerKeysConfigured` booleans only.

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

Validation is provider-aware: only credentials needed by the selected transcription, extraction, digest, and email providers are required. For the default configuration, set `GROQ_API_KEY` and `GEMINI_API_KEY`; OpenAI and Anthropic keys may remain blank. Never paste secrets into chat or tracked files.

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
2. Add every production value from `.env.example` in **Project Settings → Environment Variables**. For the default AI configuration this includes `GROQ_API_KEY`, `GROQ_TRANSCRIPTION_MODEL`, `GEMINI_API_KEY`, `GEMINI_EXTRACTION_MODEL`, and `GEMINI_DIGEST_MODEL`. Use production URLs and strong random values for `CRON_SECRET`, `ADMIN_SECRET`, and `TELEGRAM_WEBHOOK_SECRET`.
3. Deploy. Set `APP_URL` to the production origin and redeploy if needed.
4. Run `npm run telegram:register` from a trusted local terminal using the production values.
5. Open `/api/health`, send a Telegram test message, confirm the Notion records and receipt, then test the digest endpoint with an authenticated request.

`vercel.json` registers `/api/cron/digest` daily at 15:00 UTC. Vercel automatically sends `Authorization: Bearer $CRON_SECRET`; see [Vercel cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs). The route uses a deterministic alternate-calendar-day schedule in `APP_TIMEZONE`, so it needs no operational state database.

Local digest test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/digest
```

## Operations and troubleshooting

- **401 webhook:** confirm the registered webhook secret exactly matches `TELEGRAM_WEBHOOK_SECRET`.
- **403 webhook:** add the sender’s Telegram user ID and chat ID to the allowlists.
- **No voice transcription:** check the selected provider, its key, audio size/duration, and supported Telegram metadata. Groq accepts OGG directly; a 429 indicates the account/project rate limit was reached.
- **Gemini 429 or 400:** verify the selected model exists for the API key's project and region, then inspect current AI Studio quotas. Free-tier availability is not guaranteed in every region.
- **Notion validation error:** rerun `setup:notion`, use the printed data-source IDs, and confirm the integration still has page access.
- **Unassigned task:** verify the configured name/email and aliases. Matching ignores case, surrounding whitespace, and punctuation. Duplicate aliases remain unassigned because they are genuinely ambiguous.
- **Stale Notion assignee mapping:** call authenticated `POST /api/admin/refresh-notion-users`; otherwise the in-memory cache refreshes after 24 hours or on a new runtime instance.
- **Digest says `not_due`:** today is not one of the deterministic alternate calendar days in `APP_TIMEZONE`.
- **Gmail 401:** refresh token may be revoked or was issued without offline access and `gmail.send`.
- **Partial write:** inspect Vercel logs and the Telegram receipt. Contacts/resources deduplicate by details or links, tasks by title, and log entries by title plus date.

## Security

Webhook, cron, and admin endpoints are authenticated. Telegram senders/chats are allowlisted and rate-limited. Input size/type is bounded. Telegram downloads are HTTPS-only from the expected host with validated file paths. AI output passes Zod and business rules before deterministic mapping. Notion calls use bounded retries. Logs redact likely secrets and avoid full message content. Stack traces are not returned. `.env*` is ignored except `.env.example`; secrets never belong in Notion. Raw audio is not retained.

Use separate production credentials, rotate exposed credentials immediately, keep access to the Notion parent page narrow, and review Vercel and provider logs regularly.

## Cost, backup, and recovery

For four people sending short notes, normal costs should fit Vercel Hobby, Notion Free, Telegram’s API, and Gmail or Resend’s free allowance. Groq and Gemini may offer free-tier capacity, but limits and eligibility change; AI usage and any paid cost depend on audio length, tokens, models, region, and account tier. Limits in `.env` prevent unexpectedly large submissions. Review provider pricing before production.

Notion is the backup boundary: export the VeinzFlow page regularly as Markdown/CSV and retain exports outside Notion. Keep source code in GitHub and protected settings documented in a password manager. Recovery is: redeploy the repository, restore environment variables, share the Notion page with a replacement integration, rerun the idempotent setup, and register the Telegram webhook again.

## Known limitations

- Processing is synchronous; short team notes are the intended workload. A durable queue is the next scaling step.
- Groq and OpenAI are supported transcription providers. Additional transcription providers still require a new adapter.
- Arbitrary PDF/document contents are not parsed; only basic metadata/captions are captured.
- Notion API views require a small optional manual layout step.
- Contact/resource linking is conservative, and task semantic deduplication intentionally avoids aggressive guesses.
- Contacts are matched by normalized Contact Details and then name; resources by Link and then title; tasks by title; and log entries by title plus date. There is no cross-instance webhook delivery ledger.
