import { AppError } from "@/lib/errors";
import { TelegramClient } from "./client";
export async function downloadTelegramFile(
  client: TelegramClient,
  token: string,
  fileId: string,
  maxBytes: number,
): Promise<{ data: Uint8Array; filename: string }> {
  const metadata = await client.getFile(fileId);
  if (metadata.file_size && metadata.file_size > maxBytes)
    throw new AppError(
      "audio_too_large",
      "Audio file exceeds the configured size limit",
      413,
    );
  if (
    !/^[A-Za-z0-9_\-/\.]+$/.test(metadata.file_path) ||
    metadata.file_path.includes("..")
  )
    throw new AppError(
      "unsafe_file_path",
      "Telegram returned an invalid file path",
      502,
    );
  const url = new URL(
    `https://api.telegram.org/file/bot${token}/${metadata.file_path}`,
  );
  if (url.protocol !== "https:" || url.hostname !== "api.telegram.org")
    throw new AppError("unsafe_file_url", "Unexpected Telegram file host", 502);
  const response = await fetch(url);
  if (!response.ok)
    throw new AppError(
      "file_download_failed",
      "Could not download Telegram file",
      502,
    );
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > maxBytes)
    throw new AppError(
      "audio_too_large",
      "Audio file exceeds the configured size limit",
      413,
    );
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.byteLength > maxBytes)
    throw new AppError(
      "audio_too_large",
      "Audio file exceeds the configured size limit",
      413,
    );
  return {
    data,
    filename: metadata.file_path.split("/").pop() ?? "telegram-audio.ogg",
  };
}
