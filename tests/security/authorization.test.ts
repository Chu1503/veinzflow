import { describe, expect, it } from "vitest";
import {
  authorizeTelegram,
  resolveTeamMember,
  secretsEqual,
} from "@/security/authorization";
import { parseEnv } from "@/config/env";
const env = parseEnv({
  NODE_ENV: "test",
  ALLOWED_TELEGRAM_CHAT_IDS: "55",
  TEAM_MEMBERS_JSON: JSON.stringify([
    {
      name: "Sara",
      telegramUserId: "7",
      notionUserId: "n7",
      email: "sara@example.com",
      aliases: ["S"],
    },
  ]),
});
describe("authorization", () => {
  it("rejects an unauthorized Telegram sender", () =>
    expect(authorizeTelegram("8", "55", env)).toBeNull());
  it("rejects a sender in an unauthorized chat", () =>
    expect(authorizeTelegram("7", "56", env)).toBeNull());
  it("resolves one conservative alias", () =>
    expect(resolveTeamMember("S", env.teamMembers)?.name).toBe("Sara"));
  it("matches aliases case-insensitively while ignoring punctuation", () =>
    expect(resolveTeamMember("  s!!! ", env.teamMembers)?.name).toBe("Sara"));
  it("matches a configured team member by email", () =>
    expect(resolveTeamMember("SARA@EXAMPLE.COM", env.teamMembers)?.name).toBe(
      "Sara",
    ));
  it("compares secrets", () => {
    expect(secretsEqual("secret", "secret")).toBe(true);
    expect(secretsEqual("wrong", "secret")).toBe(false);
  });
});
