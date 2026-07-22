import type { AppEnv } from "@/config/env";
import type { DigestProvider } from "../contracts";
import { AnthropicDigestProvider } from "./anthropic";
import { OpenAIDigestProvider } from "./openai";
export function createDigestProvider(env: AppEnv): DigestProvider {
  return env.DIGEST_PROVIDER === "anthropic"
    ? new AnthropicDigestProvider(
        env.ANTHROPIC_DIGEST_MODEL,
        env.ANTHROPIC_API_KEY,
      )
    : new OpenAIDigestProvider(env.OPENAI_DIGEST_MODEL, env.OPENAI_API_KEY);
}
