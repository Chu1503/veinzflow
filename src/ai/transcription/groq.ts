import OpenAI from "openai";
import type {
  Transcript,
  TranscriptionInput,
  TranscriptionProvider,
} from "../contracts";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { retry, withTimeout } from "@/lib/retry";
import { normalizeAudioFileMetadata } from "@/lib/audio-file";

export type GroqTranscriptionClient = {
  create(input: {
    file: File;
    model: string;
    response_format: "json";
    temperature: number;
  }): Promise<{ text?: string }>;
};

export class GroqTranscriptionProvider implements TranscriptionProvider {
  private readonly client: GroqTranscriptionClient;

  constructor(
    private readonly model: string,
    apiKey?: string,
    client?: GroqTranscriptionClient,
    private readonly attempts = 2,
    private readonly timeoutMs = 30_000,
  ) {
    this.client =
      client ??
      (new OpenAI({
        apiKey,
        baseURL: "https://api.groq.com/openai/v1",
        timeout: timeoutMs,
        maxRetries: 0,
      }).audio.transcriptions as unknown as GroqTranscriptionClient);
  }

  async transcribe(input: TranscriptionInput): Promise<Transcript> {
    try {
      const metadata = normalizeAudioFileMetadata({
        filename: input.filename,
        mimeType: input.mimeType,
      });
      logger.info("Audio upload metadata normalized", {
        originalExtension: metadata.originalExtension,
        normalizedExtension: metadata.normalizedExtension,
        mimeType: metadata.mimeType,
        byteSize: input.data.byteLength,
      });
      return await retry(async () => {
        const bytes = new Uint8Array(input.data.byteLength);
        bytes.set(input.data);
        const file = new File([bytes.buffer], metadata.filename, {
          type: metadata.mimeType,
        });
        const result = await withTimeout(
          this.client.create({
            file,
            model: this.model,
            response_format: "json",
            temperature: 0,
          }),
          this.timeoutMs,
          "Groq transcription timed out",
        );
        const text = result.text?.trim();
        if (!text)
          throw new AppError(
            "groq_empty_transcription",
            "Groq returned an empty transcription",
            502,
            true,
          );
        return { text, provider: "groq", model: this.model };
      }, this.attempts);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "groq_transcription_failed",
        error instanceof Error ? error.message : "Groq transcription failed",
        502,
        true,
      );
    }
  }
}
