import OpenAI from "openai";
import {
  projectUpdateSchema,
  type ProjectUpdate,
} from "@/schemas/project-update";
import type { ExtractionInput, ExtractionProvider } from "../contracts";
import { extractionPrompt } from "../prompts/extract-project-update";

type OpenAITextClient = {
  create(input: {
    model: string;
    input: string;
    text: {
      format: {
        type: "json_schema";
        name: string;
        strict: true;
        schema: object;
      };
    };
  }): Promise<{ output_text: string }>;
};

export class OpenAIExtractionProvider implements ExtractionProvider {
  private readonly client: OpenAITextClient;
  constructor(
    private readonly model: string,
    apiKey?: string,
    client?: OpenAITextClient,
  ) {
    this.client =
      client ??
      (new OpenAI({ apiKey }).responses as unknown as OpenAITextClient);
  }
  async extract(input: ExtractionInput): Promise<ProjectUpdate> {
    const response = await this.client.create({
      model: this.model,
      input: extractionPrompt(input),
      text: {
        format: {
          type: "json_schema",
          name: "project_update",
          strict: true,
          schema: projectUpdateSchema.toJSONSchema(),
        },
      },
    });
    return projectUpdateSchema.parse(JSON.parse(response.output_text));
  }
}
