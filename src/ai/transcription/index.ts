import type { AppEnv } from "@/config/env";
import type { TranscriptionProvider } from "../contracts";
import { OpenAITranscriptionProvider } from "./openai";
export function createTranscriptionProvider(
  env: AppEnv,
): TranscriptionProvider {
  return new OpenAITranscriptionProvider(
    env.OPENAI_TRANSCRIPTION_MODEL,
    env.OPENAI_API_KEY,
  );
}
