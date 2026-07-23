import type { Client } from "@notionhq/client";
import type { AppEnv, TeamMember } from "@/config/env";
import { createExtractionProvider } from "@/ai/extraction";
import { createTranscriptionProvider } from "@/ai/transcription";
import type { NormalizedSubmission } from "@/telegram/types";
import { downloadTelegramFile } from "@/telegram/files";
import { TelegramClient } from "@/telegram/client";
import { telegramAudioUploadMetadata } from "@/telegram/audio";
import { dateInTimezone } from "@/lib/dates";
import { retry } from "@/lib/retry";
import { AppError, isUpstreamRateLimitError } from "@/lib/errors";
import { clarificationMessage } from "./clarify";
import { applyProjectUpdate } from "./apply-project-update";
import { applyCrudOperation } from "./apply-crud-operation";

export async function processSubmission(input: {
  submission: NormalizedSubmission;
  member: TeamMember;
  env: AppEnv;
  notion: Client;
  telegram: TelegramClient;
  onStage?: (stage: string) => void;
}): Promise<{ reply: string; partial: boolean }> {
  const { submission, member, env, notion, telegram, onStage } = input;
  let text = submission.text ?? "";
  if (submission.file) {
    onStage?.("transcription");
    if ((submission.file.duration ?? 0) > env.MAX_AUDIO_DURATION_SECONDS)
      throw new Error("Audio duration exceeds the configured limit");
    if ((submission.file.file_size ?? 0) > env.MAX_AUDIO_BYTES)
      throw new Error("Audio size exceeds the configured limit");
    if (!env.TELEGRAM_BOT_TOKEN)
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    const file = await downloadTelegramFile(
      telegram,
      env.TELEGRAM_BOT_TOKEN,
      submission.file.file_id,
      env.MAX_AUDIO_BYTES,
    );
    const upload = telegramAudioUploadMetadata(submission.file, file.filename);
    const transcript = await createTranscriptionProvider(env).transcribe({
      data: file.data,
      filename: upload.filename,
      mimeType: upload.mimeType,
    });
    text = [transcript.text, text].filter(Boolean).join("\n");
  }
  onStage?.("validation");
  if (!text)
    throw new Error("The submission contains no supported text or audio");
  if (text.length > env.MAX_TEXT_LENGTH)
    throw new Error("Submission text exceeds the configured limit");
  onStage?.("extraction");
  const provider = createExtractionProvider(env);
  const update = await retry(
    () =>
      provider.extract({
        text,
        sourceMessageId: submission.messageId,
        submittedBy: member.name,
        currentDate: dateInTimezone(new Date(), env.APP_TIMEZONE),
        timezone: env.APP_TIMEZONE,
        teamMemberAliases: env.teamMembers.map(
          (teamMember) =>
            `${teamMember.email}: ${teamMember.name} (aliases: ${teamMember.aliases.join(", ") || "none"})`,
        ),
      }),
    env.MAX_AI_ATTEMPTS,
    150,
    (error) =>
      !isUpstreamRateLimitError(error) &&
      !(error instanceof AppError && !error.retryable),
  );
  const clarification = clarificationMessage(update);
  if (clarification) return { reply: clarification, partial: false };
  onStage?.("notion_write");
  if (update.intent === "UPDATE" || update.intent === "DELETE") {
    const operation = await applyCrudOperation(notion, env, update);
    return { reply: operation.reply, partial: !operation.result };
  }
  if (update.intent === "UNKNOWN")
    return {
      reply:
        "I couldn't determine whether to create, update, or delete a record.",
      partial: false,
    };
  const results = await applyProjectUpdate(notion, env, update);
  const { successReply } = await import("@/telegram/replies");
  return {
    reply: successReply(results),
    partial: results.some((item) => item.action === "skipped"),
  };
}
