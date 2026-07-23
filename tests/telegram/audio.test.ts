import { describe, expect, it } from "vitest";
import { telegramAudioUploadMetadata } from "@/telegram/audio";

describe("Telegram audio upload metadata", () => {
  it("renames a Telegram .oga voice path using file_unique_id", () => {
    expect(
      telegramAudioUploadMetadata(
        {
          kind: "voice",
          file_id: "download-id",
          file_unique_id: "unique_voice_1",
          mime_type: "audio/ogg",
        },
        "voice/file_123.oga",
      ),
    ).toEqual({
      filename: "telegram-voice-unique_voice_1.ogg",
      mimeType: "audio/ogg",
    });
  });

  it("preserves regular audio filename and MIME metadata", () => {
    expect(
      telegramAudioUploadMetadata(
        {
          kind: "audio",
          file_id: "audio-id",
          file_name: "recording.mp3",
          mime_type: "audio/mpeg",
        },
        "file_1.mp3",
      ),
    ).toEqual({ filename: "recording.mp3", mimeType: "audio/mpeg" });
  });
});
