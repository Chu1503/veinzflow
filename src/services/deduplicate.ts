export function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}
export function canonicalUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/$/, "") || "/";
  return url.toString();
}
export type ContactCandidate = {
  id: string;
  name: string;
  organization?: string | null;
  email?: string | null;
};
export function findContactDuplicate(
  item: { name: string; organization?: string | null; email?: string | null },
  candidates: ContactCandidate[],
): ContactCandidate | undefined {
  const email = item.email?.trim().toLowerCase();
  if (email) {
    const match = candidates.find(
      (candidate) => candidate.email?.trim().toLowerCase() === email,
    );
    if (match) return match;
  }
  const name = normalizeName(item.name);
  const organization = item.organization
    ? normalizeName(item.organization)
    : "";
  return (
    candidates.find(
      (candidate) =>
        normalizeName(candidate.name) === name &&
        (!organization ||
          normalizeName(candidate.organization ?? "") === organization),
    ) ?? candidates.find((candidate) => normalizeName(candidate.name) === name)
  );
}
export type ResourceCandidate = {
  id: string;
  title: string;
  url?: string | null;
};
export function findResourceDuplicate(
  item: { title: string; url?: string | null },
  candidates: ResourceCandidate[],
): ResourceCandidate | undefined {
  if (item.url) {
    const normalized = canonicalUrl(item.url);
    const match = candidates.find(
      (candidate) =>
        candidate.url && canonicalUrl(candidate.url) === normalized,
    );
    if (match) return match;
  }
  return candidates.find(
    (candidate) => normalizeName(candidate.title) === normalizeName(item.title),
  );
}
