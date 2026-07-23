export const CONTACT_STATUSES = [
  "Need to Contact",
  "Contacted",
  "Waiting for Response",
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export function mergeContactTopics(
  couldHelpWith: string[],
  expertise: string[],
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const raw of [...couldHelpWith, ...expertise]) {
    const value = raw.trim();
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    merged.push(value);
  }
  return merged;
}

export function normalizeContactStatus(
  status: string | null | undefined,
): ContactStatus | null {
  if (!status) return null;
  const normalized = status.trim().toLocaleLowerCase();
  if (/wait|await|pending.*response|sent.*(?:email|message)/.test(normalized))
    return "Waiting for Response";
  if (/need|reach|follow.?up|to contact|not contacted|new/.test(normalized))
    return "Need to Contact";
  if (/contacted|connected|met|spoke|talked|complete|replied/.test(normalized))
    return "Contacted";
  return null;
}
