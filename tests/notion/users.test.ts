import type { Client } from "@notionhq/client";
import { describe, expect, it, vi } from "vitest";
import type { TeamMember } from "@/config/env";
import {
  getNotionUserMapping,
  refreshNotionUserMapping,
  resolveNotionUserId,
} from "@/notion/users";

const members: TeamMember[] = [
  {
    name: "Sara Chen",
    telegramUserId: "1",
    notionUserId: "configured-fallback",
    email: "sara@example.com",
    aliases: ["S. Chen"],
  },
  {
    name: "Chu",
    telegramUserId: "2",
    email: "chu@example.com",
    aliases: [],
  },
];

const person = (id: string, name: string, email: string) => ({
  object: "user" as const,
  id,
  type: "person" as const,
  name,
  avatar_url: null,
  person: { email },
});

function clientWithUsers(results: ReturnType<typeof person>[]) {
  const list = vi.fn().mockResolvedValue({
    object: "list",
    results,
    has_more: false,
    next_cursor: null,
    type: "user",
    user: {},
  });
  return { client: { users: { list } } as unknown as Client, list };
}

describe("Notion user mapping", () => {
  it("matches email first, then display name, and caches for a day", async () => {
    const { client, list } = clientWithUsers([
      person("email-match", "Someone Else", "sara@example.com"),
      person("name-match", "Chu", "different@example.com"),
    ]);
    const first = await getNotionUserMapping(client, members, { now: 100 });
    const second = await getNotionUserMapping(client, members, { now: 200 });
    expect(first.get("sara chen")).toBe("email-match");
    expect(second.get("chu")).toBe("name-match");
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("refreshes explicitly and falls back to a configured Notion ID", async () => {
    const { client, list } = clientWithUsers([]);
    const mapping = await getNotionUserMapping(client, members);
    await refreshNotionUserMapping(client, members);
    expect(resolveNotionUserId("S Chen", members, mapping)).toBe(
      "configured-fallback",
    );
    expect(list).toHaveBeenCalledTimes(2);
  });
});
