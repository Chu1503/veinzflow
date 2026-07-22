import type { ProjectUpdate } from "@/schemas/project-update";
import { projectUpdateSchema } from "@/schemas/project-update";
import type { ExtractionInput, ExtractionProvider } from "../contracts";
import { extractionPrompt } from "../prompts/extract-project-update";
import {
  createGeminiClient,
  generateGeminiStructured,
  type GeminiGenerateClient,
} from "../gemini";

export class GeminiExtractionProvider implements ExtractionProvider {
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

  extract(input: ExtractionInput): Promise<ProjectUpdate> {
    return generateGeminiStructured({
      client: this.client,
      model: this.model,
      prompt: extractionPrompt(input),
      schema: projectUpdateSchema,
      attempts: this.attempts,
      timeoutMs: this.timeoutMs,
      operation: "extraction",
    });
  }
}
