import { describe, expect, it } from "vitest";
import { OpenAIExtractionProvider } from "@/ai/extraction/openai";
import { AnthropicExtractionProvider } from "@/ai/extraction/anthropic";
import { createExtractionProvider } from "@/ai/extraction";
import { parseEnv } from "@/config/env";
import { validProjectUpdate } from "../fixtures/project-update";
const input = {
  text: "Met Dr. Patel",
  sourceMessageId: "42",
  submittedBy: "Chu",
  currentDate: "2026-07-21",
  timezone: "America/Chicago",
};
describe("extraction providers", () => {
  it("parses mocked OpenAI structured output", async () => {
    const provider = new OpenAIExtractionProvider("test", "key", {
      create: async () => ({ output_text: JSON.stringify(validProjectUpdate) }),
    });
    expect((await provider.extract(input)).contacts[0]?.name).toBe("Dr. Patel");
  });
  it("parses mocked Anthropic output", async () => {
    const provider = new AnthropicExtractionProvider("test", "key", {
      create: async () => ({
        content: [{ type: "text", text: JSON.stringify(validProjectUpdate) }],
      }),
    });
    expect((await provider.extract(input)).logEntries).toHaveLength(1);
  });
  it("switches providers by configuration", () => {
    const openai = createExtractionProvider(
      parseEnv({
        NODE_ENV: "test",
        EXTRACTION_PROVIDER: "openai",
        OPENAI_API_KEY: "test",
        TEAM_MEMBERS_JSON: "[]",
      }),
    );
    const anthropic = createExtractionProvider(
      parseEnv({
        NODE_ENV: "test",
        EXTRACTION_PROVIDER: "anthropic",
        ANTHROPIC_API_KEY: "test",
        TEAM_MEMBERS_JSON: "[]",
      }),
    );
    expect(openai).toBeInstanceOf(OpenAIExtractionProvider);
    expect(anthropic).toBeInstanceOf(AnthropicExtractionProvider);
  });
});
