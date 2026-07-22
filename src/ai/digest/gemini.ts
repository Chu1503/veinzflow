import { projectDigestSchema, type DigestInput } from "@/schemas/digest";
import type { ProjectDigest } from "@/schemas/digest";
import type { DigestProvider } from "../contracts";
import { digestPrompt } from "../prompts/create-digest";
import {
  createGeminiClient,
  generateGeminiStructured,
  type GeminiGenerateClient,
} from "../gemini";

export class GeminiDigestProvider implements DigestProvider {
  private readonly client: GeminiGenerateClient;

  constructor(
    private readonly model: string,
    apiKey?: string,
    client?: GeminiGenerateClient,
    private readonly attempts = 2,
    private readonly timeoutMs = 30_000,
  ) {
    this.client = client ?? createGeminiClient(apiKey, timeoutMs);
  }

  generateDigest(input: DigestInput): Promise<ProjectDigest> {
    return generateGeminiStructured({
      client: this.client,
      model: this.model,
      prompt: digestPrompt(input),
      schema: projectDigestSchema,
      attempts: this.attempts,
      timeoutMs: this.timeoutMs,
      operation: "digest",
    });
  }
}
