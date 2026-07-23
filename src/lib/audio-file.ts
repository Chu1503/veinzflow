import { AppError } from "@/lib/errors";

const SUPPORTED_EXTENSIONS = new Set([
  "flac",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "ogg",
  "opus",
  "wav",
  "webm",
]);

const MIME_EXTENSIONS: Record<string, string> = {
  "audio/flac": "flac",
  "audio/m4a": "m4a",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/mpga": "mpga",
  "audio/ogg": "ogg",
  "audio/opus": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function basename(filename: string): string {
  return filename.split(/[\\/]/).pop()?.trim() ?? "";
}

function extension(filename: string): string | null {
  const match = /\.([^.]+)$/.exec(filename);
  return match?.[1]?.toLowerCase() ?? null;
}

function safeStem(filename: string, fallback: string): string {
  const stem = filename.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]/g, "-");
  return stem || fallback;
}

export type NormalizedAudioFile = {
  filename: string;
  mimeType: string;
  originalExtension: string | null;
  normalizedExtension: string;
};

export function normalizeAudioFileMetadata(input: {
  filename?: string | null;
  mimeType?: string | null;
  fallbackStem?: string;
}): NormalizedAudioFile {
  const originalFilename = basename(input.filename ?? "");
  const originalExtension = extension(originalFilename);
  const mimeType = input.mimeType?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  const normalizedExtension =
    originalExtension === "oga"
      ? "ogg"
      : originalExtension && SUPPORTED_EXTENSIONS.has(originalExtension)
        ? originalExtension
        : MIME_EXTENSIONS[mimeType];
  if (!normalizedExtension)
    throw new AppError(
      "unsupported_audio_type",
      "Audio file type is not supported for transcription",
      415,
      false,
    );

  const filename =
    originalExtension && SUPPORTED_EXTENSIONS.has(originalExtension)
      ? originalFilename
      : `${safeStem(originalFilename, input.fallbackStem ?? "telegram-audio")}.${normalizedExtension}`;
  return {
    filename,
    mimeType: mimeType || "application/octet-stream",
    originalExtension: originalExtension ? `.${originalExtension}` : null,
    normalizedExtension: `.${normalizedExtension}`,
  };
}

export function hasSupportedAudioExtension(filename?: string): boolean {
  const value = extension(basename(filename ?? ""));
  return value === "oga" || Boolean(value && SUPPORTED_EXTENSIONS.has(value));
}
