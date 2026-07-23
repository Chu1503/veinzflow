import { describe, expect, it, vi } from "vitest";
import { AnthropicExtractionProvider } from "@/ai/extraction/anthropic";
import type { AnthropicMessageClient } from "@/ai/anthropic";
import { validProjectUpdate } from "../fixtures/project-update";

const input = {
  text: "Met Dr. Patel",
  sourceMessageId: "42",
  submittedBy: "Chu",
  currentDate: "2026-07-22",
  timezone: "America/Chicago",
};

function providerWithText(text: string): AnthropicExtractionProvider {
  return new AnthropicExtractionProvider("claude-3-5-haiku-latest", "key", {
    create: async () => ({
      content: [{ type: "text", text }],
      usage: { input_tokens: 100, output_tokens: 50 },
    }),
  });
}

describe("Anthropic extraction", () => {
  it("parses and validates a structured ProjectUpdate", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const result = await providerWithText(
      JSON.stringify(validProjectUpdate),
    ).extract(input);
    expect(result.contacts[0]?.name).toBe("Dr. Patel");
    expect(log).toHaveBeenCalledWith(
      "Anthropic token usage",
      expect.objectContaining({ usage: { input: 100, output: 50 } }),
    );
    log.mockRestore();
  });

  it.each([
    ["malformed JSON", "not-json"],
    ["schema-invalid JSON", JSON.stringify({ submissionSummary: "partial" })],
  ])("rejects %s", async (_label, text) => {
    await expect(providerWithText(text).extract(input)).rejects.toMatchObject({
      code: "anthropic_extraction_invalid_response",
      retryable: true,
    });
  });

  it.each([
    [401, "invalid x-api-key", "anthropic_invalid_api_key"],
    [400, "Your credit balance is too low", "anthropic_insufficient_credits"],
    [429, "rate limit exceeded", "anthropic_rate_limited"],
  ])("classifies HTTP %s provider failures", async (status, message, code) => {
    const client: AnthropicMessageClient = {
      create: async () => {
        throw Object.assign(new Error(message), { status });
      },
    };
    const provider = new AnthropicExtractionProvider(
      "claude-3-5-haiku-latest",
      "key",
      client,
    );
    await expect(provider.extract(input)).rejects.toMatchObject({
      code,
      retryable: false,
    });
  });
});
