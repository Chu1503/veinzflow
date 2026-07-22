import { timingSafeEqual } from "node:crypto";
import type { AppEnv, TeamMember } from "@/config/env";
export function secretsEqual(
  actual: string | null,
  expected: string | undefined,
): boolean {
  if (!actual || !expected) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function authorizeTelegram(
  userId: string,
  chatId: string,
  env: AppEnv,
): TeamMember | null {
  const member =
    env.teamMembers.find((item) => item.telegramUserId === userId) ?? null;
  const chatAllowed =
    env.allowedTelegramChatIds.length === 0 ||
    env.allowedTelegramChatIds.includes(chatId);
  return member && chatAllowed ? member : null;
}

export function normalizeIdentity(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolveTeamMember(
  name: string | null,
  team: TeamMember[],
): TeamMember | null {
  if (!name) return null;
  const normalized = normalizeIdentity(name);
  const matches = team.filter((member) =>
    [member.email, member.name, ...member.aliases].some(
      (alias) => normalizeIdentity(alias) === normalized,
    ),
  );
  return matches.length === 1 ? matches[0]! : null;
}
