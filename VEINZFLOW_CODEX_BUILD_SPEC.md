# VeinzFlow

## Complete Codex Build Specification

You are building **VeinzFlow**, a production-ready collaboration and research operations system for a four-person vein research project.

This repository already exists locally and already contains a `.git` directory. Preserve the existing Git history and remote configuration. Do not reinitialize Git.

Your job is to build the complete application in this repository, run it locally, test it, document it, and leave it ready for deployment to Vercel.

Do not merely describe what the user should do. Create the files, install dependencies, execute commands, run checks, fix failures, and continue until the project is functional or a genuine external credential is required.

When credentials or external account actions are required, stop only at that boundary, explain exactly what value is needed, where the user obtains it, and where it must be placed. Never invent credentials.

---

# 1. Product mission

VeinzFlow is the operating system for a four-person vein research project.

It must organize:

1. Contacts already approached
2. Potential contacts, people, professors, labs, departments, companies, and organizations
3. Contact details, expertise, relevance, conversations, outcomes, ownership, and follow-up dates
4. Papers, articles, datasets, GitHub repositories, tools, websites, videos, books, and other resources
5. Team tasks, open questions, owners, collaborators, deadlines, priorities, blockers, and statuses
6. A dated record of meetings, experiments, decisions, completed work, outcomes, strengths, weaknesses, failures, open questions, and next steps
7. Voice-first and text-first capture through Telegram
8. Automatic transcription, grammar cleanup, classification, extraction, and routing into the correct Notion databases
9. A project digest emailed to all four members every two days
10. AI-provider switching between OpenAI and Anthropic without changing the rest of the pipeline
11. Replaceable transcription and email providers
12. A clear setup and operations guide for a non-expert user

The system is for an academic research team. Favor reliability, traceability, low operating cost, privacy, maintainability, and simple operation over unnecessary complexity.

---

# 2. Final architecture

Use this architecture:

```text
Telegram voice note, text, URL, or caption
                    |
                    v
        Next.js API route on Vercel
                    |
                    v
       Normalize the Telegram update
                    |
        +-----------+-----------+
        |                       |
        v                       v
 Voice/audio input          Text/link input
        |                       |
        v                       |
Selected transcription          |
provider, initially OpenAI       |
        |                       |
        +-----------+-----------+
                    |
                    v
Selected extraction provider
OpenAI or Anthropic
                    |
                    v
Validated provider-independent ProjectUpdate
                    |
        +-----------+-----------+
        |                       |
        v                       v
Confidence checks          Duplicate checks
        |                       |
        +-----------+-----------+
                    |
                    v
Notion service layer
                    |
        +-----------+-----------+
        |                       |
        v                       v
Create/update records      Telegram receipt
```

Digest pipeline:

```text
Vercel Cron runs once daily
            |
            v
Authenticate cron request
            |
            v
Check whether two days have elapsed
            |
            v
Read recent data from Notion
            |
            v
Generate digest using selected AI provider
            |
            v
Send using selected email provider
            |
            v
Record successful digest timestamp
```

Vercel Hobby cron may run daily. Application logic must send a digest only when at least two calendar days have elapsed since the previous successful digest.

---

# 3. Required technology

Use:

- Next.js with App Router
- TypeScript in strict mode
- Node.js runtime for integration routes
- Vercel Hobby-compatible deployment
- Telegram Bot API
- Notion API
- OpenAI Audio API as the initial transcription provider
- OpenAI and Anthropic as interchangeable extraction and digest providers
- Zod for environment validation and AI-output validation
- Vercel Cron
- Gmail API and Resend behind a shared email-provider interface
- Vitest for unit tests
- ESLint
- Prettier
- npm unless the existing repository clearly uses another package manager

Do not add a separate production database in version 1 unless absolutely necessary. Notion is the source of truth. A small Notion `System State` database may store operational state such as the last digest time.

Use stable, documented SDKs. Avoid experimental packages unless no stable option exists.

---

# 4. Cost and hosting constraints

The project should be inexpensive and compatible with:

- Vercel Hobby
- Notion Free
- Telegram Bot API
- Gmail free account or Resend free tier
- Approximately $5 of initial OpenAI API credit
- Optional Anthropic API credit

Design for short voice notes from four team members.

Implement configurable limits:

```env
MAX_AUDIO_DURATION_SECONDS=600
MAX_AUDIO_BYTES=20000000
MAX_TEXT_LENGTH=20000
MAX_AI_ATTEMPTS=2
```

Avoid expensive AI calls where deterministic code is sufficient.

---

# 5. Provider independence

The rest of the application must not know whether OpenAI or Anthropic performed extraction.

Create these contracts:

```ts
export interface TranscriptionProvider {
  transcribe(input: TranscriptionInput): Promise<Transcript>;
}

export interface ExtractionProvider {
  extract(input: ExtractionInput): Promise<ProjectUpdate>;
}

export interface DigestProvider {
  generateDigest(input: DigestInput): Promise<ProjectDigest>;
}

export interface EmailProvider {
  sendDigest(input: SendDigestInput): Promise<SendDigestResult>;
}
```

Provider selection must be controlled with environment variables:

```env
TRANSCRIPTION_PROVIDER=openai
EXTRACTION_PROVIDER=openai
DIGEST_PROVIDER=openai
EMAIL_PROVIDER=gmail
```

Supported extraction providers:

- `openai`
- `anthropic`

Supported digest providers:

- `openai`
- `anthropic`

Supported transcription providers in version 1:

- `openai`

Create the abstraction so additional transcription providers can be added later without modifying Telegram or Notion code.

Supported email providers:

- `gmail`
- `resend`

Changing a provider must not alter:

- Telegram handling
- Notion schemas
- validation
- task logic
- contact logic
- resource logic
- project-log logic
- digest collection
- authorization

---

# 6. Suggested repository structure

Create a clean structure similar to:

```text
veinzflow/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── telegram/
│   │   │   │   └── webhook/
│   │   │   │       └── route.ts
│   │   │   ├── cron/
│   │   │   │   └── digest/
│   │   │   │       └── route.ts
│   │   │   ├── health/
│   │   │   │   └── route.ts
│   │   │   └── admin/
│   │   │       └── test-extraction/
│   │   │           └── route.ts
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── config/
│   │   ├── env.ts
│   │   └── constants.ts
│   ├── ai/
│   │   ├── contracts.ts
│   │   ├── prompts/
│   │   │   ├── extract-project-update.ts
│   │   │   └── create-digest.ts
│   │   ├── extraction/
│   │   │   ├── index.ts
│   │   │   ├── openai.ts
│   │   │   └── anthropic.ts
│   │   ├── transcription/
│   │   │   ├── index.ts
│   │   │   └── openai.ts
│   │   └── digest/
│   │       ├── index.ts
│   │       ├── openai.ts
│   │       └── anthropic.ts
│   ├── schemas/
│   │   ├── project-update.ts
│   │   ├── contact.ts
│   │   ├── resource.ts
│   │   ├── task.ts
│   │   ├── project-log.ts
│   │   └── digest.ts
│   ├── notion/
│   │   ├── client.ts
│   │   ├── query.ts
│   │   ├── contacts.ts
│   │   ├── resources.ts
│   │   ├── tasks.ts
│   │   ├── project-log.ts
│   │   ├── system-state.ts
│   │   └── mapping.ts
│   ├── telegram/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── files.ts
│   │   ├── normalize-update.ts
│   │   └── replies.ts
│   ├── email/
│   │   ├── index.ts
│   │   ├── contracts.ts
│   │   ├── gmail.ts
│   │   └── resend.ts
│   ├── digest/
│   │   ├── collect.ts
│   │   ├── render.ts
│   │   └── schedule.ts
│   ├── services/
│   │   ├── process-submission.ts
│   │   ├── apply-project-update.ts
│   │   ├── deduplicate.ts
│   │   ├── clarify.ts
│   │   └── audit.ts
│   ├── security/
│   │   ├── rate-limit.ts
│   │   ├── authorization.ts
│   │   └── redact.ts
│   └── lib/
│       ├── dates.ts
│       ├── logger.ts
│       ├── errors.ts
│       └── retry.ts
├── scripts/
│   ├── setup-notion.ts
│   ├── register-telegram-webhook.ts
│   ├── delete-telegram-webhook.ts
│   ├── verify-environment.ts
│   └── seed-demo-data.ts
├── tests/
│   ├── extraction/
│   ├── schemas/
│   ├── notion/
│   └── fixtures/
├── public/
├── .env.example
├── .gitignore
├── AGENTS.md
├── README.md
├── vercel.json
├── package.json
└── tsconfig.json
```

Adjust when justified, but preserve separation among providers, domain schemas, persistence, Telegram transport, and orchestration.

---

# 7. Notion workspace

The user will create one empty Notion parent page named **VeinzFlow** and share it with a Notion integration.

Provide an idempotent or safely repeatable script:

```bash
npm run setup:notion
```

It should create the databases beneath the parent page and avoid duplicates where practical.

If the Notion API cannot create a specific linked view or homepage layout, create everything the API supports and document the remaining small manual action in `README.md`.

## 7.1 Home page

Create a VeinzFlow home page containing:

- project title
- short description
- how the workspace works
- link to Telegram bot
- links to each database
- voice submission examples
- instructions for assigning tasks
- instructions for contact ownership
- privacy note
- explanation that cleaned summaries and original transcripts are stored
- explanation of the two-day digest

## 7.2 Contacts database

Properties:

| Property           | Type                    |
| ------------------ | ----------------------- |
| Name               | Title                   |
| Contact Type       | Select                  |
| Contact Status     | Select or Status        |
| Organization       | Rich text               |
| Role               | Rich text               |
| Email              | Email                   |
| Phone              | Phone                   |
| Website            | URL                     |
| Expertise          | Multi-select            |
| Why Relevant       | Rich text               |
| Could Help With    | Multi-select            |
| Connected To       | Relation to Contacts    |
| Owner              | People                  |
| First Contact Date | Date                    |
| Last Contact Date  | Date                    |
| Next Follow-Up     | Date                    |
| What We Discussed  | Rich text               |
| Outcome            | Rich text               |
| Next Step          | Rich text               |
| Related Meetings   | Relation to Project Log |
| Related Tasks      | Relation to Tasks       |
| Notes              | Rich text               |
| Source             | Select                  |
| Telegram Source ID | Rich text               |
| Created At         | Created time            |
| Updated At         | Last edited time        |

Contact Status values:

- Potential Contact
- Need to Contact
- Contacted
- Waiting for Response
- Active Collaborator
- Not Relevant
- Closed

Contact Type values:

- Person
- Lab
- Professor
- Researcher
- Company
- Organization
- Department
- Other

## 7.3 Resources database

Properties:

| Property            | Type                    |
| ------------------- | ----------------------- |
| Title               | Title                   |
| Resource Type       | Select                  |
| URL                 | URL                     |
| Authors or Creator  | Rich text               |
| Publication         | Rich text               |
| Publication Date    | Date                    |
| Added By            | People                  |
| Date Added          | Created time            |
| Short Description   | Rich text               |
| Why It Matters      | Rich text               |
| Key Findings        | Rich text               |
| Relevant To         | Multi-select            |
| Status              | Select                  |
| Related Tasks       | Relation to Tasks       |
| Related Log Entries | Relation to Project Log |
| Citation            | Rich text               |
| Files               | Files                   |
| Source              | Select                  |
| Telegram Source ID  | Rich text               |

Resource Type values:

- Research Paper
- Article
- GitHub Repository
- Dataset
- Tool
- Website
- Video
- Book
- Other

Status values:

- Unread
- Reviewing
- Reviewed
- Useful
- Rejected

## 7.4 Tasks and Questions database

Properties:

| Property           | Type                    |
| ------------------ | ----------------------- |
| Task               | Title                   |
| Type               | Select                  |
| Status             | Select or Status        |
| Assigned To        | People                  |
| Collaborators      | People                  |
| Priority           | Select                  |
| Due Date           | Date                    |
| Start Date         | Date                    |
| Project Area       | Multi-select            |
| Description        | Rich text               |
| Definition of Done | Rich text               |
| Blocked By         | Relation to Tasks       |
| Related Contact    | Relation to Contacts    |
| Related Resource   | Relation to Resources   |
| Related Log Entry  | Relation to Project Log |
| Created By         | People                  |
| Source             | Select                  |
| Completed Date     | Date                    |
| Result             | Rich text               |
| Telegram Source ID | Rich text               |
| Created At         | Created time            |
| Updated At         | Last edited time        |

Type values:

- Task
- Question
- Research
- Contact
- Decision Needed

Status values:

- Inbox
- Not Started
- In Progress
- Blocked
- Review
- Done
- Cancelled

Priority values:

- Critical
- High
- Medium
- Low

## 7.5 Project Log database

Properties:

| Property              | Type                  |
| --------------------- | --------------------- |
| Entry Title           | Title                 |
| Date                  | Date                  |
| Entry Type            | Select                |
| Participants          | People                |
| External Participants | Relation to Contacts  |
| Summary               | Rich text             |
| Work Completed        | Rich text             |
| Outcome               | Rich text             |
| What Worked           | Rich text             |
| What Did Not Work     | Rich text             |
| Open Questions        | Rich text             |
| Decisions Made        | Rich text             |
| Next Steps            | Rich text             |
| Related Tasks         | Relation to Tasks     |
| Related Resources     | Relation to Resources |
| Project Phase         | Select                |
| Attachments           | Files                 |
| Submitted By          | People                |
| Source                | Select                |
| Original Transcript   | Rich text             |
| Telegram Source ID    | Rich text             |
| Created At            | Created time          |
| Updated At            | Last edited time      |

Entry Type values:

- Progress Update
- Meeting
- Experiment
- Decision
- Completed Work
- Problem
- Observation
- Milestone
- External Conversation

Project Phase values:

- Planning
- Literature Review
- Outreach
- Research
- Design
- Building
- Testing
- Analysis
- Writing
- Complete

Each Project Log page body should contain:

```markdown
## Summary

## What Happened

## Outcome

## What Worked

## What Did Not Work

## Decisions

## Open Questions

## Next Steps

## Related Evidence and Files

## Original Transcript
```

## 7.6 System State database

Create a small clearly marked database with:

- Key
- Value
- Updated At

Use it for:

- last successful digest timestamp
- schema version
- processed Telegram update identifiers where useful

Never store API secrets in Notion.

---

# 8. Team-member configuration

Telegram identities must map to Notion users and email recipients.

Use an environment variable:

```env
TEAM_MEMBERS_JSON='[
  {
    "name": "Chu",
    "telegramUserId": "123456789",
    "notionUserId": "notion-user-id",
    "email": "person@example.com",
    "aliases": ["Chu"]
  }
]'
```

Requirements:

- authorize only configured Telegram users or a configured group/chat
- support `ALLOWED_TELEGRAM_CHAT_IDS`
- resolve aliases conservatively
- never invent assignments
- allow unassigned tasks
- provide a diagnostic method for discovering Telegram user and chat IDs
- do not expose internal IDs in normal user-facing messages

---

# 9. Telegram behavior

## 9.1 Accepted input

Support:

- text messages
- voice notes
- audio files when practical
- URLs
- captions
- basic document metadata

Version 1 does not need to parse arbitrary PDF contents automatically.

## 9.2 Webhook security

Use Telegram's webhook secret token and validate:

```text
X-Telegram-Bot-Api-Secret-Token
```

Also validate the sender or allowed chat.

Make processing idempotent using Telegram update IDs or message IDs.

Return quickly enough to avoid repeated webhook delivery. If processing risks exceeding the practical webhook duration, structure the code so queueing can be added later. For version 1, normal short notes may be processed synchronously.

## 9.3 Voice pipeline

For voice input:

1. Validate sender and chat.
2. Read voice metadata.
3. Reject files beyond configured limits.
4. Use `getFile`.
5. Download the file server-side.
6. Pass it to the transcription provider.
7. Preserve original transcript.
8. Run extraction.
9. Validate extraction.
10. Detect ambiguity and duplicates.
11. Apply safe records.
12. Send a receipt.

Do not permanently store raw audio by default.

## 9.4 Example

Input:

```text
We met Dr. Patel today. She may let us use the ultrasound equipment.
Sara should email her our equipment list by Friday.
```

Expected result:

- create or update Dr. Patel in Contacts
- create a Project Log external-conversation entry
- create a task for Sara with a due date
- link the records where possible
- send a concise Telegram confirmation

## 9.5 Confirmation behavior

For clear information:

```text
Added:
• Contact update: Dr. Patel
• Project log: Meeting with Dr. Patel
• Task: Send equipment list, assigned to Sara, due Friday
```

For uncertain information:

```text
I understood that John may handle a hardware task next week, but the task and deadline are unclear.

Please reply with:
1. The exact task
2. The intended deadline
```

Do not silently invent missing names, deadlines, decisions, outcomes, or technical claims.

---

# 10. Domain schemas

Use Zod for all schemas.

The provider-independent root model should resemble:

```ts
type ProjectUpdate = {
  submissionSummary: string;
  contacts: ContactUpdate[];
  resources: ResourceUpdate[];
  tasks: TaskUpdate[];
  logEntries: ProjectLogEntryInput[];
  uncertainties: Uncertainty[];
  confidence: number;
  needsConfirmation: boolean;
};
```

Every extracted item should include enough source metadata for traceability.

## 10.1 ContactUpdate

Include:

- name
- contactType
- contactStatus
- organization
- role
- email
- phone
- website
- expertise
- whyRelevant
- couldHelpWith
- ownerName
- firstContactDate
- lastContactDate
- nextFollowUp
- discussion
- outcome
- nextStep
- notes
- sourceMessageId
- confidence

## 10.2 ResourceUpdate

Include:

- title
- resourceType
- url
- authorsOrCreator
- publication
- publicationDate
- shortDescription
- whyItMatters
- keyFindings
- relevantTo
- status
- citation
- sourceMessageId
- confidence

## 10.3 TaskUpdate

Include:

- title
- type
- status
- assignedToName
- collaboratorNames
- priority
- dueDate
- startDate
- projectArea
- description
- definitionOfDone
- relatedContactName
- relatedResourceUrl
- result
- sourceMessageId
- confidence

## 10.4 ProjectLogEntryInput

Include:

- title
- date
- entryType
- participantNames
- externalParticipantNames
- summary
- workCompleted
- outcome
- whatWorked
- whatDidNotWork
- openQuestions
- decisionsMade
- nextSteps
- projectPhase
- originalTranscript
- sourceMessageId
- confidence

## 10.5 Uncertainty

Include:

- field
- itemType
- explanation
- clarificationQuestion
- severity

---

# 11. Extraction instructions

Create a strong provider-neutral extraction prompt.

The model must:

- convert speech into clean structured information
- correct grammar without changing meaning
- preserve technical details
- use the current date and configured timezone for relative-date resolution
- distinguish confirmed facts from possibilities
- distinguish a task from a question
- distinguish a decision from a suggestion
- detect multiple records in one submission
- avoid inventing missing facts
- return only the required structured schema
- set `needsConfirmation` when ambiguity affects ownership, deadline, identity, outcome, or decision status

Default timezone:

```env
APP_TIMEZONE=America/Chicago
```

Store both:

- cleaned summary
- original transcript

---

# 12. Deduplication and update rules

## Contacts

Before creating a contact, search by:

1. normalized email
2. normalized exact name plus organization
3. normalized exact name

When a likely match exists, update only fields supported by new evidence.

Do not overwrite a populated field with `null` or lower-confidence data.

## Resources

Before creating, search by:

1. normalized canonical URL
2. DOI when available
3. exact normalized title

## Tasks

Use `Telegram Source ID` for idempotency.

Avoid aggressive semantic task deduplication in version 1. When an exact or near-exact open task exists, add context or return a possible duplicate warning.

## Project Log

Use source message ID to prevent duplicate creation.

---

# 13. Notion write rules

The AI must never directly construct arbitrary Notion payloads.

Pipeline:

```text
AI response
   -> Zod validation
   -> business-rule validation
   -> deduplication
   -> deterministic Notion mapping
   -> Notion API
```

Implement retries for transient Notion errors with bounded exponential backoff.

Provide actionable logs while redacting secrets and sensitive message content where appropriate.

---

# 14. Digest

Run a Vercel cron daily, but send only when two days have elapsed.

Collect:

- project-log entries created since the previous digest
- tasks completed since the previous digest
- tasks due in the next seven days
- overdue tasks
- blocked tasks
- unassigned high-priority tasks
- contact follow-ups due
- recent decisions
- recently added resources
- unresolved questions

Generate a concise email:

```text
VeinzFlow Project Update
Reporting period: [start] to [end]

What happened
Completed work
Decisions
Coming up
Overdue or blocked
Open questions
Contact follow-ups
Recently added resources
```

The digest must remain useful even if AI generation fails. Implement a deterministic fallback renderer.

After successful delivery, update the last successful digest timestamp. Do not update it if sending fails.

Prevent duplicate digest sends.

---

# 15. Email providers

## Gmail

Support OAuth-based Gmail sending.

Document:

- Google Cloud project setup
- Gmail API activation
- OAuth client creation
- refresh token acquisition
- required environment variables

## Resend

Support Resend through:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Provider selection:

```env
EMAIL_PROVIDER=gmail
```

or:

```env
EMAIL_PROVIDER=resend
```

Recipients must come from `TEAM_MEMBERS_JSON`.

---

# 16. Environment variables

Create a complete `.env.example` containing:

```env
APP_NAME=VeinzFlow
APP_URL=http://localhost:3000
APP_TIMEZONE=America/Chicago
NODE_ENV=development

TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
ALLOWED_TELEGRAM_CHAT_IDS=
TEAM_MEMBERS_JSON=[]

NOTION_TOKEN=
NOTION_PARENT_PAGE_ID=
NOTION_CONTACTS_DATABASE_ID=
NOTION_RESOURCES_DATABASE_ID=
NOTION_TASKS_DATABASE_ID=
NOTION_PROJECT_LOG_DATABASE_ID=
NOTION_SYSTEM_STATE_DATABASE_ID=

TRANSCRIPTION_PROVIDER=openai
EXTRACTION_PROVIDER=openai
DIGEST_PROVIDER=openai

OPENAI_API_KEY=
OPENAI_TRANSCRIPTION_MODEL=
OPENAI_EXTRACTION_MODEL=
OPENAI_DIGEST_MODEL=

ANTHROPIC_API_KEY=
ANTHROPIC_EXTRACTION_MODEL=
ANTHROPIC_DIGEST_MODEL=

EMAIL_PROVIDER=gmail

GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_SENDER_EMAIL=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

CRON_SECRET=
ADMIN_SECRET=

MAX_AUDIO_DURATION_SECONDS=600
MAX_AUDIO_BYTES=20000000
MAX_TEXT_LENGTH=20000
MAX_AI_ATTEMPTS=2
```

Use sensible documented defaults for model names, but keep them configurable.

Validate required variables based on the selected providers.

---

# 17. Local development

The application must be runnable with:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add scripts:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint or eslint",
  "format": "prettier --write .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "setup:notion": "...",
  "telegram:register": "...",
  "telegram:delete-webhook": "...",
  "env:verify": "...",
  "seed:demo": "..."
}
```

Use a local tunnel only for local Telegram webhook testing. Document a recommended approach, but production should use the deployed Vercel URL.

---

# 18. Minimal web interface

Create a clean, simple homepage that displays:

- VeinzFlow name
- project-system description
- integration status indicators based only on safe checks
- setup checklist
- link to health endpoint
- no secrets
- no private project data

No elaborate dashboard is required because Notion is the workspace.

Add `/api/health` that reports safe service configuration status without revealing secrets.

---

# 19. Security

Required:

- validate Telegram webhook secret
- authorize sender/chat
- authenticate cron endpoint
- authenticate admin test endpoint
- never commit `.env.local`
- redact API keys and tokens from logs
- reject oversized inputs
- validate content types
- avoid SSRF when fetching external URLs
- only fetch Telegram files from expected Telegram API locations
- apply basic per-user rate limiting where practical
- use constant-time secret comparison when appropriate
- do not expose stack traces in production responses
- do not store raw audio permanently
- do not store credentials in Notion
- add a security section to README

Codex must not paste real secrets into tracked files.

---

# 20. Reliability

Implement:

- typed errors
- clear error categories
- bounded retries for transient external failures
- idempotency
- graceful Telegram error replies
- deterministic digest fallback
- schema-validation retry for malformed AI output
- safe handling of partial Notion writes

When one submission creates several records and a later write fails, report partial success clearly.

---

# 21. Testing

Add tests for:

1. project-update schema validation
2. OpenAI extraction adapter with mocked responses
3. Anthropic extraction adapter with mocked responses
4. provider switching
5. relative-date handling
6. assignment resolution
7. unauthorized Telegram sender rejection
8. webhook-secret rejection
9. contact deduplication
10. resource URL deduplication
11. idempotent Telegram updates
12. digest due-date calculation
13. digest deterministic fallback
14. environment validation
15. Notion property mapping

Include fixtures for:

- a meeting that creates a contact, task, and log entry
- a new research paper URL
- an ambiguous owner
- an ambiguous deadline
- a completed experiment with positive and negative results
- a potential lab contact
- a simple task update
- an unauthorized sender

All network tests must use mocks.

---

# 22. README

Write a beginner-friendly but technically complete README containing:

1. What VeinzFlow does
2. Architecture diagram
3. Requirements
4. Local setup
5. Notion integration setup
6. Running `setup:notion`
7. Telegram bot creation through BotFather
8. Finding Telegram user/chat IDs
9. OpenAI API setup
10. Optional Anthropic API setup
11. Gmail setup
12. Optional Resend setup
13. Environment variables
14. Running locally
15. Testing Telegram locally
16. Deploying to Vercel
17. Adding Vercel environment variables
18. Registering the production webhook
19. Configuring Vercel Cron
20. Switching AI providers
21. Troubleshooting
22. Security
23. Expected operating cost
24. Backup and recovery
25. Known limitations

Use exact commands.

---

# 23. AGENTS.md

Create an `AGENTS.md` for future Codex work. It should explain:

- product purpose
- architecture boundaries
- provider abstractions
- testing commands
- coding conventions
- security constraints
- never to bypass Zod validation
- never to let an AI response write directly to Notion
- never to commit secrets
- preference for simple maintainable code
- requirement to update README when setup changes

---

# 24. Vercel

Create `vercel.json` with a daily cron route.

Example intent:

```json
{
  "crons": [
    {
      "path": "/api/cron/digest",
      "schedule": "0 15 * * *"
    }
  ]
}
```

The route must authenticate requests and apply the two-day send rule.

Use Node.js runtime and set a reasonable function duration compatible with Hobby.

Do not assume background jobs continue after the response.

---

# 25. Git behavior

The repository already has `.git`.

Requirements:

- do not run `git init`
- inspect current remote with `git remote -v`
- do not alter or remove the remote without permission
- create logical commits after major milestones if the environment permits
- never commit secrets
- ensure `.gitignore` includes `.env*` exceptions only for `.env.example`
- keep the working tree understandable
- show the user a final `git status`
- do not force-push

The GitHub repository can be renamed separately. The code should use VeinzFlow in package metadata and documentation.

---

# 26. Build sequence

Perform the work in this order without asking the user to manually create code:

## Milestone 1: inspect and scaffold

- inspect repository
- verify Git
- scaffold Next.js in the existing empty repository
- install dependencies
- set TypeScript strict mode
- add linting, formatting, testing

## Milestone 2: domain and providers

- add Zod schemas
- add provider contracts
- add OpenAI transcription
- add OpenAI extraction
- add Anthropic extraction
- add digest providers

## Milestone 3: Telegram

- webhook authentication
- sender authorization
- text and voice normalization
- file download
- replies
- idempotency

## Milestone 4: Notion

- setup script
- database mappings
- create/update/query services
- deduplication
- relations
- system state

## Milestone 5: orchestration

- process submission
- validate
- clarify
- write records
- Telegram receipt

## Milestone 6: digest and email

- collect data
- generate digest
- deterministic fallback
- Gmail provider
- Resend provider
- cron scheduling

## Milestone 7: interface and operations

- homepage
- health endpoint
- admin extraction test endpoint
- scripts
- README
- AGENTS.md

## Milestone 8: validation

Run and fix:

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

Do not claim completion while any of these fail.

---

# 27. External credential checkpoints

Build as much as possible using mocks and placeholders before requesting credentials.

Credentials likely required later:

- Telegram bot token
- Telegram webhook secret
- Notion integration token
- Notion parent page ID
- OpenAI API key
- optional Anthropic API key
- Gmail OAuth credentials or Resend API key
- Vercel account authorization

When a credential is required:

1. state the exact variable name
2. explain where to obtain it
3. instruct the user to place it in `.env.local`
4. do not ask the user to paste the secret into chat
5. continue after the user confirms it is present

---

# 28. Definition of done

The project is complete when:

- the repository contains a working Next.js application
- provider switching is implemented
- Telegram text flow works with mocks and can work live after credentials
- Telegram voice flow works with OpenAI transcription after credentials
- Notion setup script creates the required workspace structure
- clear submissions create appropriate Notion records
- ambiguous submissions request clarification
- records are deduplicated and idempotent
- the digest is generated and sent every two days
- Gmail and Resend are replaceable
- environment variables are validated
- tests pass
- lint passes
- typecheck passes
- production build passes
- README is complete
- no secrets are committed
- the application is ready for Vercel deployment

---

# 29. First action

Begin now.

1. Inspect the current folder.
2. Confirm that `.git` exists.
3. Inspect `git status` and `git remote -v`.
4. Scaffold the application directly in this folder.
5. Continue through the milestones.
6. Ask for external credentials only when the local code, mocks, tests, and setup scripts are ready for them.
7. Keep a concise running checklist of completed and remaining work.
