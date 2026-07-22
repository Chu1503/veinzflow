import type { Client } from "@notionhq/client";
import type { AppEnv, TeamMember } from "@/config/env";
import { createExtractionProvider } from "@/ai/extraction";
import { createTranscriptionProvider } from "@/ai/transcription";
import type { NormalizedSubmission } from "@/telegram/types";
import { downloadTelegramFile } from "@/telegram/files";
import { TelegramClient } from "@/telegram/client";
import { dateInTimezone } from "@/lib/dates";
import { retry } from "@/lib/retry";
import { clarificationMessage } from "./clarify";
import { applyProjectUpdate } from "./apply-project-update";

export async function processSubmission(input: {
  submission: NormalizedSubmission;
  member: TeamMember;
  env: AppEnv;
  notion: Client;
  telegram: TelegramClient;
}): Promise<{ reply: string; partial: boolean }> {
  const { submission, member, env, notion, telegram } = input;
  let text = submission.text ?? "";
  if (submission.file) {
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
    const transcript = await createTranscriptionProvider(env).transcribe({
      data: file.data,
      filename: file.filename,
      mimeType: submission.file.mime_type ?? "audio/ogg",
    });
    text = [transcript.text, text].filter(Boolean).join("\n");
  }
  if (!text)
    throw new Error("The submission contains no supported text or audio");
  if (text.length > env.MAX_TEXT_LENGTH)
    throw new Error("Submission text exceeds the configured limit");
  const provider = createExtractionProvider(env);
  const update = await retry(
    () =>
      provider.extract({
        text,
        sourceMessageId: submission.messageId,
        submittedBy: member.name,
        currentDate: dateInTimezone(new Date(), env.APP_TIMEZONE),
        timezone: env.APP_TIMEZONE,
      }),
    env.MAX_AI_ATTEMPTS,
  );
  const clarification = clarificationMessage(update);
  if (clarification) return { reply: clarification, partial: false };
  const results = await applyProjectUpdate(notion, env, update);
  const { successReply } = await import("@/telegram/replies");
  return {
    reply: successReply(results),
    partial: results.some((item) => item.action === "skipped"),
  };
}
