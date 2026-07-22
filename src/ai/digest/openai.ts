import OpenAI from "openai";
import type { DigestProvider } from "../contracts";
import {
  projectDigestSchema,
  type DigestInput,
  type ProjectDigest,
} from "@/schemas/digest";
import { digestPrompt } from "../prompts/create-digest";

type Client = { create(input: object): Promise<{ output_text: string }> };
export class OpenAIDigestProvider implements DigestProvider {
  private readonly client: Client;
  constructor(
    private readonly model: string,
    apiKey?: string,
    client?: Client,
  ) {
    this.client =
      client ?? (new OpenAI({ apiKey }).responses as unknown as Client);
  }
  async generateDigest(input: DigestInput): Promise<ProjectDigest> {
    const response = await this.client.create({
      model: this.model,
      input: digestPrompt(input),
      text: {
        format: {
          type: "json_schema",
          name: "project_digest",
          strict: true,
          schema: projectDigestSchema.toJSONSchema(),
        },
      },
    });
    return projectDigestSchema.parse(JSON.parse(response.output_text));
  }
}
