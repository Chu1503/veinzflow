import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";
import { AppError } from "@/lib/errors";
import { retry, withTimeout } from "@/lib/retry";

export type GeminiGenerateClient = {
  models: {
    generateContent(input: {
      model: string;
      contents: string;
      config: {
        responseMimeType: "application/json";
        responseJsonSchema: object;
      };
    }): Promise<{ text?: string }>;
  };
};

export function createGeminiClient(
  apiKey: string | undefined,
  timeoutMs: number,
): GeminiGenerateClient {
  return new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: timeoutMs },
  }) as unknown as GeminiGenerateClient;
}

function providerSchema(schema: ZodType): object {
  const jsonSchema = schema.toJSONSchema() as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}

function parseJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```json\s*|\s*```$/g, ""));
}

export async function generateGeminiStructured<T>(input: {
  client: GeminiGenerateClient;
  model: string;
  prompt: string;
  schema: ZodType<T>;
  attempts: number;
  timeoutMs: number;
  operation: string;
}): Promise<T> {
  try {
    return await retry(async () => {
      const response = await withTimeout(
        input.client.models.generateContent({
          model: input.model,
          contents: input.prompt,
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: providerSchema(input.schema),
          },
        }),
        input.timeoutMs,
        `Gemini ${input.operation} timed out`,
      );
      const text = response.text?.trim();
      if (!text) throw new Error(`Gemini returned no ${input.operation} text`);
      return input.schema.parse(parseJson(text));
    }, input.attempts);
  } catch (error) {
    throw new AppError(
      `gemini_${input.operation}_failed`,
      error instanceof Error
        ? error.message
        : `Gemini ${input.operation} failed`,
      502,
      true,
    );
  }
}
