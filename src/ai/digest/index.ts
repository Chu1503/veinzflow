import type { AppEnv } from "@/config/env";
import type { DigestProvider } from "../contracts";
import { AnthropicDigestProvider } from "./anthropic";
import { GeminiDigestProvider } from "./gemini";
import { OpenAIDigestProvider } from "./openai";
export function createDigestProvider(env: AppEnv): DigestProvider {
  switch (env.DIGEST_PROVIDER) {
    case "openai":
      return new OpenAIDigestProvider(
        env.OPENAI_DIGEST_MODEL,
        env.OPENAI_API_KEY,
      );
    case "anthropic":
      return new AnthropicDigestProvider(
        env.ANTHROPIC_DIGEST_MODEL,
        env.ANTHROPIC_API_KEY,
      );
    case "gemini":
      return new GeminiDigestProvider(
        env.GEMINI_DIGEST_MODEL,
        env.GEMINI_API_KEY,
        undefined,
        env.MAX_AI_ATTEMPTS,
      );
    default:
      throw new Error(
        `Unsupported digest provider: ${String(env.DIGEST_PROVIDER)}`,
      );
  }
}
