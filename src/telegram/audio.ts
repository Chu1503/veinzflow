import type { TelegramFile } from "./types";

export function telegramAudioUploadMetadata(
  file: TelegramFile & { kind: "voice" | "audio" | "document" },
  downloadedFilename: string,
): { filename: string; mimeType: string } {
  if (file.kind === "voice") {
    const identifier = (file.file_unique_id ?? file.file_id).replace(
      /[^A-Za-z0-9_-]/g,
      "-",
    );
    return {
      filename: `telegram-voice-${identifier}.ogg`,
      mimeType: "audio/ogg",
    };
  }
  return {
    filename: file.file_name ?? downloadedFilename,
    mimeType: file.mime_type ?? "application/octet-stream",
  };
}
