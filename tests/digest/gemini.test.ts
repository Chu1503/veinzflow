import { describe, expect, it } from "vitest";
import { createDigestProvider } from "@/ai/digest";
import { AnthropicDigestProvider } from "@/ai/digest/anthropic";
import { GeminiDigestProvider } from "@/ai/digest/gemini";
import { OpenAIDigestProvider } from "@/ai/digest/openai";
import type { DigestProvider } from "@/ai/contracts";
import type { GeminiGenerateClient } from "@/ai/gemini";
import { parseEnv } from "@/config/env";
import { generateDigestWithFallback } from "@/digest/generate";

const data = {
  periodStart: "2026-07-20",
  periodEnd: "2026-07-22",
  logEntries: ["Completed ultrasound calibration"],
  completedTasks: ["Calibrate probe"],
  upcomingTasks: ["Review signal quality"],
  overdueTasks: [],
  blockedTasks: [],
  unassignedHighPriorityTasks: [],
  contactFollowUps: ["Follow up with Dr. Patel"],
  decisions: ["Use the revised protocol"],
  resources: ["Ultrasound methods paper"],
  unresolvedQuestions: ["Which cuff size is best?"],
};

describe("Gemini digest", () => {
  it("generates a structured digest", async () => {
    const client: GeminiGenerateClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            subject: "VeinzFlow update",
            text: "Completed ultrasound calibration",
            html: "<p>Completed ultrasound calibration</p>",
          }),
        }),
      },
    };
    const provider = new GeminiDigestProvider(
      "gemini-3.5-flash",
      "test-key",
      client,
      1,
    );
    await expect(provider.generateDigest(data)).resolves.toMatchObject({
      subject: "VeinzFlow update",
    });
  });

  it("uses the deterministic fallback when Gemini fails", async () => {
    const failing: DigestProvider = {
      generateDigest: async () => {
        throw new Error("Gemini unavailable");
      },
    };
    const digest = await generateDigestWithFallback(failing, data);
    expect(digest.text).toContain("Completed ultrasound calibration");
    expect(digest.text).toContain("Which cuff size is best?");
  });

  it("keeps Gemini, OpenAI, and Anthropic selectable", () => {
    const base = { NODE_ENV: "test", TEAM_MEMBERS_JSON: "[]" } as const;
    expect(
      createDigestProvider(
        parseEnv({ ...base, DIGEST_PROVIDER: "gemini", GEMINI_API_KEY: "x" }),
      ),
    ).toBeInstanceOf(GeminiDigestProvider);
    expect(
      createDigestProvider(
        parseEnv({ ...base, DIGEST_PROVIDER: "openai", OPENAI_API_KEY: "x" }),
      ),
    ).toBeInstanceOf(OpenAIDigestProvider);
    expect(
      createDigestProvider(
        parseEnv({
          ...base,
          DIGEST_PROVIDER: "anthropic",
          ANTHROPIC_API_KEY: "x",
        }),
      ),
    ).toBeInstanceOf(AnthropicDigestProvider);
  });
});
