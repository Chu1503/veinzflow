# VeinzFlow agent guide

## Purpose and boundaries

VeinzFlow is a low-cost, traceable research-operations pipeline for four people. Telegram is capture/transport, AI providers transcribe or extract, Zod owns the provider-independent domain boundary, deterministic services map validated objects, Notion is the source of truth, and email providers deliver the digest. Keep these layers separate.

Provider selection belongs only in `src/ai/*/index.ts` and `src/email/index.ts`. Telegram code must not depend on OpenAI/Anthropic details. Notion code must never accept an arbitrary model-authored payload.

## Non-negotiable rules

- Never bypass Zod validation or weaken it to accommodate malformed model output.
- Never let AI output write directly to Notion. Flow must remain AI → schema → business rules/deduplication → deterministic mapping → API.
- Never invent assignment, identity, dates, decisions, outcomes, or technical claims. Ask for clarification or leave fields empty.
- Never commit secrets, `.env.local`, raw audio, private project content, or exported Notion data.
- Never log full tokens or sensitive message contents. Preserve the redaction boundary.
- Keep Notion as the sole production data store unless a documented version change explicitly adds another.
- Prefer simple maintainable code and bounded synchronous work suitable for four people and Vercel Hobby.
- Update `README.md` and `.env.example` whenever setup, scripts, providers, or required settings change.

## Conventions

Use strict TypeScript, small provider contracts, Zod-inferred domain types, and dependency injection for network adapter tests. All network tests use mocks. Routes run on the Node.js runtime. Use constant-time checks for shared secrets, bounded retries only for transient operations, and source IDs for idempotency.

Before handing off changes, run:

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

No check may remain failing. Keep `.env.example` credential-free and inspect `git status` before completion.
