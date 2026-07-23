import { z } from "zod";
import { NextResponse } from "next/server";
import { getEnv } from "@/config/env";
import { secretsEqual, authorizeTelegram } from "@/security/authorization";
import { checkRateLimit } from "@/security/rate-limit";
import { normalizeTelegramUpdate } from "@/telegram/normalize-update";
import type { TelegramUpdate } from "@/telegram/types";
import { TelegramClient } from "@/telegram/client";
import { getNotionClient } from "@/notion/client";
import { processSubmission } from "@/services/process-submission";
import { errorReply, providerRateLimitReply } from "@/telegram/replies";
import { logger } from "@/lib/logger";
import { isUpstreamRateLimitError } from "@/lib/errors";
import {
  claimTelegramUpdate,
  markTelegramUpdateHandled,
} from "@/telegram/update-idempotency";
export const runtime = "nodejs";
export const maxDuration = 60;
const updateSchema = z
  .object({
    update_id: z.number().int(),
    message: z.unknown().optional(),
    edited_message: z.unknown().optional(),
  })
  .passthrough();

const handled = (extra: Record<string, unknown> = {}) =>
  NextResponse.json(
    { ok: true, processed: false, errorHandled: true, ...extra },
    { status: 200 },
  );

function sanitizedError(error: unknown): { name: string; message: string } {
  const name = error instanceof Error ? error.name : "UnknownError";
  const message = error instanceof Error ? error.message : "Unknown error";
  return {
    name: name.replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 100),
    message: message
      .replace(
        /(token|secret|api[-_ ]?key|authorization)(\s*[:=]\s*)\S+/gi,
        "$1$2[REDACTED]",
      )
      .replace(/(sk-|gsk_|AIza|re_)[A-Za-z0-9_-]+/g, "[REDACTED]")
      .slice(0, 500),
  };
}

function rawMessageMetadata(update: TelegramUpdate): {
  messageId: string | null;
  chatId: string | null;
} {
  const message = update.message ?? update.edited_message;
  return {
    messageId:
      message && typeof message.message_id === "number"
        ? String(message.message_id)
        : null,
    chatId:
      message?.chat && typeof message.chat.id === "number"
        ? String(message.chat.id)
        : null,
  };
}

export async function POST(request: Request) {
  const env = getEnv();
  if (
    !secretsEqual(
      request.headers.get("x-telegram-bot-api-secret-token"),
      env.TELEGRAM_WEBHOOK_SECRET,
    )
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    logger.warn("Telegram request JSON could not be parsed", {
      updateId: null,
      messageId: null,
      chatId: null,
      stage: "request_parse",
      error: sanitizedError(error),
    });
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const candidate =
      body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : undefined;
    logger.warn("Telegram update failed validation", {
      updateId:
        typeof candidate?.update_id === "number"
          ? String(candidate.update_id)
          : null,
      messageId: null,
      chatId: null,
      stage: "request_validation",
      error: {
        name: "ValidationError",
        message: "Telegram update shape was invalid",
      },
    });
    return handled({ reason: "invalid_update", validationFailed: true });
  }
  const raw = parsed.data as TelegramUpdate;
  const updateId = String(raw.update_id);
  const rawMetadata = rawMessageMetadata(raw);
  if (!claimTelegramUpdate(updateId)) {
    logger.info("Duplicate Telegram update suppressed", {
      updateId,
      ...rawMetadata,
      stage: "idempotency",
    });
    return Response.json(
      { ok: true, processed: false, duplicate: true },
      { status: 200 },
    );
  }

  let submission;
  try {
    submission = normalizeTelegramUpdate(raw);
  } catch (error) {
    logger.warn("Telegram update was deliberately ignored", {
      updateId,
      ...rawMetadata,
      stage: "normalization",
      error: sanitizedError(error),
    });
    markTelegramUpdateHandled(updateId);
    return handled({ reason: "unsupported_update" });
  }

  const member = authorizeTelegram(submission.userId, submission.chatId, env);
  if (!member) {
    logger.warn("Telegram update was rejected", {
      updateId,
      messageId: submission.messageId,
      chatId: submission.chatId,
      stage: "authorization",
      error: { name: "UnauthorizedSender", message: "Sender not authorized" },
    });
    markTelegramUpdateHandled(updateId);
    return handled({ reason: "sender_not_authorized" });
  }
  if (!checkRateLimit(submission.userId)) {
    logger.warn("Telegram update was rate limited", {
      updateId,
      messageId: submission.messageId,
      chatId: submission.chatId,
      stage: "rate_limit",
      error: { name: "RateLimitError", message: "Rate limit exceeded" },
    });
    markTelegramUpdateHandled(updateId);
    return handled({ reason: "rate_limited" });
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.error("Telegram update could not be processed", {
      updateId,
      messageId: submission.messageId,
      chatId: submission.chatId,
      stage: "configuration",
      error: {
        name: "ConfigurationError",
        message: "Telegram bot is not configured",
      },
    });
    markTelegramUpdateHandled(updateId);
    return handled({ reason: "service_not_configured" });
  }
  const telegram = new TelegramClient(env.TELEGRAM_BOT_TOKEN);
  let stage = "initialization";
  try {
    const notion = getNotionClient();
    const result = await processSubmission({
      submission,
      member,
      env,
      notion,
      telegram,
      onStage: (nextStage) => {
        stage = nextStage;
      },
    });
    stage = "success_reply";
    await telegram.sendMessage(submission.chatId, result.reply);
    markTelegramUpdateHandled(updateId);
    logger.info("Telegram update processed", {
      updateId,
      messageId: submission.messageId,
      chatId: submission.chatId,
      stage: "completed",
    });
    return Response.json({ ok: true, processed: true }, { status: 200 });
  } catch (error) {
    const providerRateLimited =
      stage === "extraction" && isUpstreamRateLimitError(error);
    logger.error("Telegram submission failed", {
      updateId,
      messageId: submission.messageId,
      chatId: submission.chatId,
      stage,
      error: sanitizedError(error),
    });
    if (stage !== "success_reply")
      try {
        await telegram.sendMessage(
          submission.chatId,
          providerRateLimited ? providerRateLimitReply() : errorReply(),
        );
      } catch (replyError) {
        logger.error("Telegram error reply failed", {
          updateId,
          messageId: submission.messageId,
          chatId: submission.chatId,
          stage: "error_reply",
          error: sanitizedError(replyError),
        });
      }
    markTelegramUpdateHandled(updateId);
    return handled(providerRateLimited ? { rateLimited: true } : {});
  }
}
