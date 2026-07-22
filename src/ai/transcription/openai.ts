import OpenAI from "openai";
import type {
  Transcript,
  TranscriptionInput,
  TranscriptionProvider,
} from "../contracts";

export class OpenAITranscriptionProvider implements TranscriptionProvider {
  private readonly client: OpenAI;
  constructor(
    private readonly model: string,
    apiKey?: string,
    client?: OpenAI,
  ) {
    this.client = client ?? new OpenAI({ apiKey });
  }
  async transcribe(input: TranscriptionInput): Promise<Transcript> {
    const bytes = new Uint8Array(input.data.byteLength);
    bytes.set(input.data);
    const file = new File([bytes.buffer], input.filename, {
      type: input.mimeType,
    });
    const result = await this.client.audio.transcriptions.create({
      file,
      model: this.model,
    });
    return { text: result.text, provider: "openai", model: this.model };
  }
}
