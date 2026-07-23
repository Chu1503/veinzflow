import type { DigestProvider } from "../contracts";
import {
  projectDigestSchema,
  type DigestInput,
  type ProjectDigest,
} from "@/schemas/digest";
import { digestPrompt } from "../prompts/create-digest";
import {
  createAnthropicClient,
  generateAnthropicStructured,
  type AnthropicMessageClient,
} from "../anthropic";

export class AnthropicDigestProvider implements DigestProvider {
  private readonly client: AnthropicMessageClient;
  constructor(
    private readonly model: string,
    apiKey?: string,
    client?: AnthropicMessageClient,
  ) {
    this.client = client ?? createAnthropicClient(apiKey);
  }
  generateDigest(input: DigestInput): Promise<ProjectDigest> {
    return generateAnthropicStructured({
      client: this.client,
      model: this.model,
      prompt: digestPrompt(input),
      schema: projectDigestSchema,
      maxTokens: 2_000,
      operation: "digest",
    });
  }
}
