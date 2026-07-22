import { describe, expect, it } from "vitest";
import { parseEnv } from "@/config/env";
describe("environment validation", () => {
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
});
