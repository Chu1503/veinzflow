import { z } from "zod";
import { getEnv } from "@/config/env";
import { secretsEqual, authorizeTelegram } from "@/security/authorization";
import { checkRateLimit } from "@/security/rate-limit";
import { normalizeTelegramUpdate } from "@/telegram/normalize-update";
import type { TelegramUpdate } from "@/telegram/types";
import { TelegramClient } from "@/telegram/client";
import { getNotionClient } from "@/notion/client";
import { getState, setState } from "@/notion/system-state";
import { processSubmission } from "@/services/process-submission";
import { errorReply } from "@/telegram/replies";
import { logger } from "@/lib/logger";
export const runtime = "nodejs";
export const maxDuration = 60;
const updateSchema = z
  .object({
    update_id: z.number().int(),
    message: z.unknown().optional(),
    edited_message: z.unknown().optional(),
  })
  .passthrough();
export async function POST(request: Request) {
  const env = getEnv();
  if (
    !secretsEqual(
      request.headers.get("x-telegram-bot-api-secret-token"),
      env.TELEGRAM_WEBHOOK_SECRET,
    )
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  let submission;
  try {
    const raw = updateSchema.parse(await request.json()) as TelegramUpdate;
    submission = normalizeTelegramUpdate(raw);
  } catch {
    return Response.json({ error: "Unsupported update" }, { status: 400 });
  }
  const member = authorizeTelegram(submission.userId, submission.chatId, env);
  if (!member)
    return Response.json({ error: "Sender not authorized" }, { status: 403 });
  if (!checkRateLimit(submission.userId))
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  if (!env.TELEGRAM_BOT_TOKEN || !env.NOTION_SYSTEM_STATE_DATABASE_ID)
    return Response.json({ error: "Service not configured" }, { status: 503 });
  const telegram = new TelegramClient(env.TELEGRAM_BOT_TOKEN);
  const notion = getNotionClient();
  const stateKey = `telegram_update:${submission.updateId}`;
  if (await getState(notion, env.NOTION_SYSTEM_STATE_DATABASE_ID, stateKey)) {
    await telegram.sendMessage(
      submission.chatId,
      "This update was already processed; no duplicate records were created.",
    );
    return Response.json({ ok: true, duplicate: true });
  }
  try {
    const result = await processSubmission({
      submission,
      member,
      env,
      notion,
      telegram,
    });
    await telegram.sendMessage(submission.chatId, result.reply);
    if (!result.reply.includes("clarification"))
      await setState(
        notion,
        env.NOTION_SYSTEM_STATE_DATABASE_ID,
        stateKey,
        new Date().toISOString(),
      );
    return Response.json({ ok: true });
  } catch (error) {
    logger.error("Telegram submission failed", {
      updateId: submission.updateId,
      error: error instanceof Error ? error.message : "unknown",
    });
    await telegram
      .sendMessage(submission.chatId, errorReply())
      .catch(() => undefined);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
