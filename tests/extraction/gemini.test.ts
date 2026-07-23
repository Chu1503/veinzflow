import { describe, expect, it } from "vitest";
import { createExtractionProvider } from "@/ai/extraction";
import { GeminiExtractionProvider } from "@/ai/extraction/gemini";
import type { GeminiGenerateClient } from "@/ai/gemini";
import { parseEnv } from "@/config/env";
import { validProjectUpdate } from "../fixtures/project-update";

const input = {
  text: "Met Dr. Patel. Sara should send the equipment list Friday.",
  sourceMessageId: "42",
  submittedBy: "Chu",
  currentDate: "2026-07-22",
  timezone: "America/Chicago",
  teamMemberAliases: ["Chu", "Sara", "S"],
};

function clientWith(responses: string[]): {
  client: GeminiGenerateClient;
  calls: () => number;
} {
  let count = 0;
  return {
    client: {
      models: {
        generateContent: async () => ({
          text: responses[Math.min(count++, responses.length - 1)],
        }),
      },
    },
    calls: () => count,
  };
}

describe("Gemini extraction", () => {
  it("selects Gemini through configuration", () => {
    const env = parseEnv({
      NODE_ENV: "test",
      TEAM_MEMBERS_JSON: "[]",
      EXTRACTION_PROVIDER: "gemini",
      GEMINI_API_KEY: "test-key",
    });
    expect(createExtractionProvider(env)).toBeInstanceOf(
      GeminiExtractionProvider,
    );
  });

  it("parses a successful structured ProjectUpdate", async () => {
    const mock = clientWith([JSON.stringify(validProjectUpdate)]);
    const provider = new GeminiExtractionProvider(
      "gemini-3.5-flash",
      "test-key",
      mock.client,
      1,
    );
    const result = await provider.extract(input);
    expect(result.contacts[0]?.name).toBe("Dr. Patel");
    expect(result.tasks[0]?.sourceMessageId).toBe("42");
  });

  it("rejects malformed JSON", async () => {
    const mock = clientWith(["not-json"]);
    const provider = new GeminiExtractionProvider(
      "gemini-3.5-flash",
      "test-key",
      mock.client,
      1,
    );
    await expect(provider.extract(input)).rejects.toMatchObject({
      code: "gemini_extraction_failed",
    });
  });

  it("rejects JSON that fails Zod validation", async () => {
    const mock = clientWith([JSON.stringify({ submissionSummary: "partial" })]);
    const provider = new GeminiExtractionProvider(
      "gemini-3.5-flash",
      "test-key",
      mock.client,
      1,
    );
    await expect(provider.extract(input)).rejects.toMatchObject({
      code: "gemini_extraction_failed",
    });
  });

  it("retries after invalid structured output", async () => {
    const mock = clientWith(["invalid", JSON.stringify(validProjectUpdate)]);
    const provider = new GeminiExtractionProvider(
      "gemini-3.5-flash",
      "test-key",
      mock.client,
      2,
    );
    await expect(provider.extract(input)).resolves.toMatchObject({
      needsConfirmation: false,
    });
    expect(mock.calls()).toBe(2);
  });

  it("does not retry an upstream 429", async () => {
    let calls = 0;
    const client: GeminiGenerateClient = {
      models: {
        generateContent: async () => {
          calls += 1;
          throw Object.assign(new Error("429 quota exceeded"), {
            status: 429,
          });
        },
      },
    };
    const provider = new GeminiExtractionProvider(
      "gemini-3.5-flash",
      "test-key",
      client,
      3,
    );
    await expect(provider.extract(input)).rejects.toMatchObject({
      status: 429,
      retryable: false,
    });
    expect(calls).toBe(1);
  });

  it("preserves uncertainty and needsConfirmation", async () => {
    const ambiguous = {
      ...validProjectUpdate,
      needsConfirmation: true,
      uncertainties: [
        {
          field: "assignedToName",
          itemType: "task",
          explanation: "Owner was not explicit",
          clarificationQuestion: "Who owns the task?",
          severity: "high",
        },
      ],
    };
    const mock = clientWith([JSON.stringify(ambiguous)]);
    const provider = new GeminiExtractionProvider(
      "gemini-3.5-flash",
      "test-key",
      mock.client,
      1,
    );
    const result = await provider.extract(input);
    expect(result.needsConfirmation).toBe(true);
    expect(result.uncertainties[0]?.clarificationQuestion).toBe(
      "Who owns the task?",
    );
  });
});
