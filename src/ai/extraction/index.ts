import type { AppEnv } from "@/config/env";
import type { ExtractionProvider } from "../contracts";
import { AnthropicExtractionProvider } from "./anthropic";
import { OpenAIExtractionProvider } from "./openai";

export function createExtractionProvider(env: AppEnv): ExtractionProvider {
  return env.EXTRACTION_PROVIDER === "anthropic"
    ? new AnthropicExtractionProvider(
        env.ANTHROPIC_EXTRACTION_MODEL,
        env.ANTHROPIC_API_KEY,
      )
    : new OpenAIExtractionProvider(
        env.OPENAI_EXTRACTION_MODEL,
        env.OPENAI_API_KEY,
      );
}
