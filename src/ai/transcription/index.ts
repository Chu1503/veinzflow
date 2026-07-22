import type { AppEnv } from "@/config/env";
import type { TranscriptionProvider } from "../contracts";
import { GroqTranscriptionProvider } from "./groq";
import { OpenAITranscriptionProvider } from "./openai";
export function createTranscriptionProvider(
  env: AppEnv,
): TranscriptionProvider {
  switch (env.TRANSCRIPTION_PROVIDER) {
    case "openai":
      return new OpenAITranscriptionProvider(
        env.OPENAI_TRANSCRIPTION_MODEL,
        env.OPENAI_API_KEY,
      );
    case "groq":
      return new GroqTranscriptionProvider(
        env.GROQ_TRANSCRIPTION_MODEL,
        env.GROQ_API_KEY,
        undefined,
        env.MAX_AI_ATTEMPTS,
      );
    default:
      throw new Error(
        `Unsupported transcription provider: ${String(env.TRANSCRIPTION_PROVIDER)}`,
      );
  }
}
