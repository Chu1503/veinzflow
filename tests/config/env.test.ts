import { describe, expect, it } from "vitest";
import { parseEnv } from "@/config/env";
describe("environment validation", () => {
  const strictBase = {
    NODE_ENV: "production",
    TEAM_MEMBERS_JSON: "[]",
    TELEGRAM_BOT_TOKEN: "telegram-test",
    TELEGRAM_WEBHOOK_SECRET: "webhook-test",
    NOTION_TOKEN: "notion-test",
    CRON_SECRET: "cron-test",
    EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: "resend-test",
    RESEND_FROM_EMAIL: "updates@example.com",
  } as const;

  it("parses team members and limits", () => {
    const env = parseEnv({
      NODE_ENV: "test",
      TEAM_MEMBERS_JSON:
        '[{"name":"Chu","telegramUserId":"1","email":"chu@example.com","aliases":[]}]',
      MAX_TEXT_LENGTH: "123",
    });
    expect(env.teamMembers[0]?.name).toBe("Chu");
    expect(env.MAX_TEXT_LENGTH).toBe(123);
  });
  it("validates selected provider requirements in strict mode", () => {
    expect(() =>
      parseEnv({ NODE_ENV: "production", TEAM_MEMBERS_JSON: "[]" }, true),
    ).toThrow("TELEGRAM_BOT_TOKEN");
  });

  it("accepts Groq and Gemini without OpenAI or Anthropic keys", () => {
    const env = parseEnv(
      {
        ...strictBase,
        TRANSCRIPTION_PROVIDER: "groq",
        EXTRACTION_PROVIDER: "gemini",
        DIGEST_PROVIDER: "gemini",
        GROQ_API_KEY: "test-key",
        GEMINI_API_KEY: "test-key",
      },
      true,
    );
    expect(env.TRANSCRIPTION_PROVIDER).toBe("groq");
    expect(env.EXTRACTION_PROVIDER).toBe("gemini");
    expect(env.DIGEST_PROVIDER).toBe("gemini");
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("requires GROQ_API_KEY when Groq is selected", () => {
    expect(() =>
      parseEnv(
        {
          ...strictBase,
          TRANSCRIPTION_PROVIDER: "groq",
          EXTRACTION_PROVIDER: "gemini",
          DIGEST_PROVIDER: "gemini",
          GEMINI_API_KEY: "test-key",
        },
        true,
      ),
    ).toThrow("GROQ_API_KEY");
  });

  it("requires GEMINI_API_KEY when Gemini is selected", () => {
    expect(() =>
      parseEnv(
        {
          ...strictBase,
          TRANSCRIPTION_PROVIDER: "groq",
          EXTRACTION_PROVIDER: "gemini",
          DIGEST_PROVIDER: "gemini",
          GROQ_API_KEY: "test-key",
        },
        true,
      ),
    ).toThrow("GEMINI_API_KEY");
  });
});
