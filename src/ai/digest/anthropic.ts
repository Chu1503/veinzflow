import Anthropic from "@anthropic-ai/sdk";
import type { DigestProvider } from "../contracts";
import {
  projectDigestSchema,
  type DigestInput,
  type ProjectDigest,
} from "@/schemas/digest";
import { digestPrompt } from "../prompts/create-digest";
type Client = {
  create(
    input: object,
  ): Promise<{ content: Array<{ type: string; text?: string }> }>;
};
export class AnthropicDigestProvider implements DigestProvider {
  private readonly client: Client;
  constructor(
    private readonly model: string,
    apiKey?: string,
    client?: Client,
  ) {
    this.client =
      client ?? (new Anthropic({ apiKey }).messages as unknown as Client);
  }
  async generateDigest(input: DigestInput): Promise<ProjectDigest> {
    const response = await this.client.create({
      model: this.model,
      max_tokens: 3000,
      messages: [{ role: "user", content: digestPrompt(input) }],
    });
    const text = response.content.find((block) => block.type === "text")?.text;
    if (!text) throw new Error("Anthropic returned no digest");
    return projectDigestSchema.parse(
      JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")),
    );
  }
}
