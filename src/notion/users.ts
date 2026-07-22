import {
  isFullUser,
  type Client,
  type UserObjectResponse,
} from "@notionhq/client";
import type { TeamMember } from "@/config/env";
import { logger } from "@/lib/logger";
import { normalizeIdentity, resolveTeamMember } from "@/security/authorization";

export type NotionUserMapping = ReadonlyMap<string, string>;

type CacheEntry = {
  expiresAt: number;
  mapping: NotionUserMapping;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new WeakMap<Client, CacheEntry>();
const pending = new WeakMap<Client, Promise<NotionUserMapping>>();

async function fetchWorkspaceUsers(client: Client) {
  const users: UserObjectResponse[] = [];
  let startCursor: string | undefined;
  do {
    const response = await client.users.list({
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    });
    users.push(...response.results.filter(isFullUser));
    startCursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (startCursor);
  return users;
}

export async function getNotionUserMapping(
  client: Client,
  teamMembers: TeamMember[],
  options: { forceRefresh?: boolean; now?: number } = {},
): Promise<NotionUserMapping> {
  const now = options.now ?? Date.now();
  const existing = cache.get(client);
  if (!options.forceRefresh && existing && existing.expiresAt > now)
    return existing.mapping;
  const inFlight = pending.get(client);
  if (!options.forceRefresh && inFlight) return inFlight;

  const lookup = (async () => {
    const notionUsers = await fetchWorkspaceUsers(client);
    const mapping = new Map<string, string>();
    for (const member of teamMembers) {
      const email = member.email.trim().toLocaleLowerCase();
      const emailMatch = notionUsers.find(
        (user) =>
          user.type === "person" &&
          user.person.email?.trim().toLocaleLowerCase() === email,
      );
      if (emailMatch) {
        mapping.set(normalizeIdentity(member.name), emailMatch.id);
        continue;
      }

      const nameMatches = notionUsers.filter(
        (user) =>
          normalizeIdentity(user.name ?? "") === normalizeIdentity(member.name),
      );
      if (nameMatches.length === 1) {
        mapping.set(normalizeIdentity(member.name), nameMatches[0]!.id);
        continue;
      }

      logger.warn(
        "Could not automatically match a team member to a Notion user",
        {
          teamMember: member.name,
          ambiguousDisplayName: nameMatches.length > 1,
          configuredFallbackAvailable: Boolean(member.notionUserId),
        },
      );
    }

    const entry = { expiresAt: now + CACHE_TTL_MS, mapping };
    cache.set(client, entry);
    return mapping;
  })();
  pending.set(client, lookup);
  try {
    return await lookup;
  } finally {
    if (pending.get(client) === lookup) pending.delete(client);
  }
}

export async function refreshNotionUserMapping(
  client: Client,
  teamMembers: TeamMember[],
): Promise<NotionUserMapping> {
  return getNotionUserMapping(client, teamMembers, { forceRefresh: true });
}

export function resolveNotionUserId(
  mentionedName: string | null,
  teamMembers: TeamMember[],
  mapping: NotionUserMapping,
): string | null {
  const member = resolveTeamMember(mentionedName, teamMembers);
  if (!member) return null;
  return (
    mapping.get(normalizeIdentity(member.name)) ?? member.notionUserId ?? null
  );
}
