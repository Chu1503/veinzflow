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
export function resolveTeamMember(
  name: string | null,
  team: TeamMember[],
): TeamMember | null {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  const matches = team.filter((member) =>
    [member.name, ...member.aliases].some(
      (alias) => alias.trim().toLowerCase() === normalized,
    ),
  );
  return matches.length === 1 ? matches[0]! : null;
}
