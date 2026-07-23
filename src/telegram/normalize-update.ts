import type { NormalizedSubmission, TelegramUpdate } from "./types";
import { hasSupportedAudioExtension } from "@/lib/audio-file";
export function normalizeTelegramUpdate(
  update: TelegramUpdate,
): NormalizedSubmission {
  const message = update.message ?? update.edited_message;
  if (!message?.from)
    throw new Error("Telegram update has no supported message or sender");
  const audioDocument =
    message.document &&
    (message.document.mime_type?.toLowerCase().startsWith("audio/") ||
      hasSupportedAudioExtension(message.document.file_name));
  const file = message.voice
    ? { ...message.voice, kind: "voice" as const }
    : message.audio
      ? { ...message.audio, kind: "audio" as const }
      : audioDocument
        ? { ...message.document!, kind: "document" as const }
        : null;
  const documentMetadata = message.document
    ? `Document: ${message.document.file_name ?? "unnamed"} (${message.document.mime_type ?? "unknown type"}, ${message.document.file_size ?? "unknown size"} bytes)`
    : null;
  const content = [message.text, message.caption, documentMetadata]
    .filter(Boolean)
    .join("\n")
    .trim();
  return {
    updateId: String(update.update_id),
    messageId: String(message.message_id),
    chatId: String(message.chat.id),
    userId: String(message.from.id),
    userLabel: message.from.username
      ? `@${message.from.username}`
      : message.from.first_name,
    text: content || null,
    file,
    documentMetadata,
  };
}
