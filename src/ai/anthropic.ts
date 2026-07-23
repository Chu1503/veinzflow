import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { AppError, isUpstreamRateLimitError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type AnthropicMessageResponse = {
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export type AnthropicMessageClient = {
  create(input: object): Promise<AnthropicMessageResponse>;
};

export function createAnthropicClient(
  apiKey: string | undefined,
): AnthropicMessageClient {
  return new Anthropic({
    apiKey,
    maxRetries: 0,
    timeout: 30_000,
  }).messages as unknown as AnthropicMessageClient;
}

function errorRecord(error: unknown): Record<string, unknown> | undefined {
  return error && typeof error === "object"
    ? (error as Record<string, unknown>)
    : undefined;
}

function errorMessage(error: unknown): string {
  const record = errorRecord(error);
  return error instanceof Error
    ? error.message
    : typeof record?.message === "string"
      ? record.message
      : "";
}

export function anthropicError(
  error: unknown,
  operation: "extraction" | "digest",
): AppError {
  if (error instanceof AppError) return error;
  const record = errorRecord(error);
  const status = record?.status ?? record?.statusCode;
  const message = errorMessage(error);
  if (
    status === 401 ||
    /invalid.*api key|authentication|unauthorized/i.test(message)
  )
    return new AppError(
      "anthropic_invalid_api_key",
      "Anthropic rejected the configured API key",
      401,
      false,
    );
  if (
    status === 402 ||
    /credit balance|insufficient credit|billing|payment required/i.test(message)
  )
    return new AppError(
      "anthropic_insufficient_credits",
      "Anthropic account has insufficient credits",
      402,
      false,
    );
  if (isUpstreamRateLimitError(error))
    return new AppError(
      "anthropic_rate_limited",
      "Anthropic rate limit exceeded",
      429,
      false,
    );
  return new AppError(
    `anthropic_${operation}_failed`,
    `Anthropic ${operation} request failed`,
    502,
    true,
  );
}

function parseJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```json\s*|\s*```$/g, ""));
}

export async function generateAnthropicStructured<T>(input: {
  client: AnthropicMessageClient;
  model: string;
  prompt: string;
  schema: ZodType<T>;
  maxTokens: number;
  operation: "extraction" | "digest";
}): Promise<T> {
  let response: AnthropicMessageResponse;
  try {
    response = await input.client.create({
      model: input.model,
      max_tokens: input.maxTokens,
      messages: [
        {
          role: "user",
          content: `${input.prompt}\nReturn only JSON matching this schema: ${JSON.stringify(input.schema.toJSONSchema())}`,
        },
      ],
    });
  } catch (error) {
    throw anthropicError(error, input.operation);
  }

  logger.info("Anthropic token usage", {
    provider: "anthropic",
    operation: input.operation,
    model: input.model,
    usage: {
      input: response.usage?.input_tokens ?? null,
      output: response.usage?.output_tokens ?? null,
    },
  });

  const text = response.content.find((block) => block.type === "text")?.text;
  if (!text)
    throw new AppError(
      `anthropic_${input.operation}_invalid_response`,
      `Anthropic returned no ${input.operation} JSON`,
      502,
      true,
    );
  try {
    return input.schema.parse(parseJson(text));
  } catch {
    throw new AppError(
      `anthropic_${input.operation}_invalid_response`,
      `Anthropic returned invalid ${input.operation} JSON`,
      502,
      true,
    );
  }
}
