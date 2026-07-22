import Anthropic from "@anthropic-ai/sdk";
import {
  projectUpdateSchema,
  type ProjectUpdate,
} from "@/schemas/project-update";
import type { ExtractionInput, ExtractionProvider } from "../contracts";
import { extractionPrompt } from "../prompts/extract-project-update";

type AnthropicTextClient = {
  create(
    input: object,
  ): Promise<{ content: Array<{ type: string; text?: string }> }>;
};
export class AnthropicExtractionProvider implements ExtractionProvider {
  private readonly client: AnthropicTextClient;
  constructor(
    private readonly model: string,
    apiKey?: string,
    client?: AnthropicTextClient,
  ) {
    this.client =
      client ??
      (new Anthropic({ apiKey }).messages as unknown as AnthropicTextClient);
  }
  async extract(input: ExtractionInput): Promise<ProjectUpdate> {
    const response = await this.client.create({
      model: this.model,
      max_tokens: 5000,
      messages: [
        {
          role: "user",
          content: `${extractionPrompt(input)}\nJSON Schema: ${JSON.stringify(projectUpdateSchema.toJSONSchema())}`,
        },
      ],
    });
    const text = response.content.find((block) => block.type === "text")?.text;
    if (!text) throw new Error("Anthropic returned no text");
    return projectUpdateSchema.parse(
      JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")),
    );
  }
}
