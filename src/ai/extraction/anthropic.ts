import {
  projectUpdateSchema,
  type ProjectUpdate,
} from "@/schemas/project-update";
import type { ExtractionInput, ExtractionProvider } from "../contracts";
import { extractionPrompt } from "../prompts/extract-project-update";
import {
  createAnthropicClient,
  generateAnthropicStructured,
  type AnthropicMessageClient,
} from "../anthropic";

export class AnthropicExtractionProvider implements ExtractionProvider {
  private readonly client: AnthropicMessageClient;
  constructor(
    private readonly model: string,
    apiKey?: string,
    client?: AnthropicMessageClient,
  ) {
    this.client = client ?? createAnthropicClient(apiKey);
  }
  extract(input: ExtractionInput): Promise<ProjectUpdate> {
    return generateAnthropicStructured({
      client: this.client,
      model: this.model,
      prompt: extractionPrompt(input),
      schema: projectUpdateSchema,
      maxTokens: 4_000,
      operation: "extraction",
    });
  }
}
