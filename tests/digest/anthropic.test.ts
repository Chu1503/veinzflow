import { describe, expect, it } from "vitest";
import { AnthropicDigestProvider } from "@/ai/digest/anthropic";
import type { AnthropicMessageClient } from "@/ai/anthropic";
import { generateDigestWithFallback } from "@/digest/generate";

const input = {
  periodStart: "2026-07-20",
  periodEnd: "2026-07-22",
  logEntries: ["Completed calibration"],
  completedTasks: ["Calibrate probe"],
  activeTasks: ["Review signal quality"],
  resources: ["Ultrasound paper"],
  questions: ["Which cuff size is best?"],
};

describe("Anthropic digest", () => {
  it("generates and validates a structured digest", async () => {
    const provider = new AnthropicDigestProvider(
      "claude-3-5-haiku-latest",
      "key",
      {
        create: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                subject: "VeinzFlow update",
                text: "Completed calibration",
                html: "<p>Completed calibration</p>",
              }),
            },
          ],
          usage: { input_tokens: 80, output_tokens: 30 },
        }),
      },
    );
    await expect(provider.generateDigest(input)).resolves.toMatchObject({
      subject: "VeinzFlow update",
    });
  });

  it("rejects malformed output and preserves deterministic fallback", async () => {
    const provider = new AnthropicDigestProvider(
      "claude-3-5-haiku-latest",
      "key",
      { create: async () => ({ content: [{ type: "text", text: "bad" }] }) },
    );
    const digest = await generateDigestWithFallback(provider, input);
    expect(digest.text).toContain("Completed calibration");
    expect(digest.text).toContain("Which cuff size is best?");
  });

  it("classifies insufficient credits", async () => {
    const client: AnthropicMessageClient = {
      create: async () => {
        throw Object.assign(new Error("credit balance is too low"), {
          status: 400,
        });
      },
    };
    const provider = new AnthropicDigestProvider(
      "claude-3-5-haiku-latest",
      "key",
      client,
    );
    await expect(provider.generateDigest(input)).rejects.toMatchObject({
      code: "anthropic_insufficient_credits",
      retryable: false,
    });
  });
});
