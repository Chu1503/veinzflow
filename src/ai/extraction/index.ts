import type { AppEnv } from "@/config/env";
import type { ExtractionProvider } from "../contracts";
import { AnthropicExtractionProvider } from "./anthropic";
import { GeminiExtractionProvider } from "./gemini";
import { OpenAIExtractionProvider } from "./openai";

export function createExtractionProvider(env: AppEnv): ExtractionProvider {
  switch (env.EXTRACTION_PROVIDER) {
    case "openai":
      return new OpenAIExtractionProvider(
        env.OPENAI_EXTRACTION_MODEL,
        env.OPENAI_API_KEY,
      );
    case "anthropic":
      return new AnthropicExtractionProvider(
        env.ANTHROPIC_EXTRACTION_MODEL,
        env.ANTHROPIC_API_KEY,
      );
    case "gemini":
      return new GeminiExtractionProvider(
        env.GEMINI_EXTRACTION_MODEL,
        env.GEMINI_API_KEY,
        undefined,
        env.MAX_AI_ATTEMPTS,
      );
    default:
      throw new Error(
        `Unsupported extraction provider: ${String(env.EXTRACTION_PROVIDER)}`,
      );
  }
}
