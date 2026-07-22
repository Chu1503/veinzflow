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
  contactDetails?: string | null;
};
export function findContactDuplicate(
  item: { name: string; contactDetails?: string | null },
  candidates: ContactCandidate[],
): ContactCandidate | undefined {
  const contactDetails = item.contactDetails?.trim().toLowerCase();
  if (contactDetails) {
    const match = candidates.find(
      (candidate) =>
        candidate.contactDetails?.trim().toLowerCase() === contactDetails,
    );
    if (match) return match;
  }
  const name = normalizeName(item.name);
  return candidates.find((candidate) => normalizeName(candidate.name) === name);
}
export type ResourceCandidate = {
  id: string;
  title: string;
  link?: string | null;
};
export function findResourceDuplicate(
  item: { title: string; link?: string | null },
  candidates: ResourceCandidate[],
): ResourceCandidate | undefined {
  if (item.link) {
    const normalized = canonicalUrl(item.link);
    const match = candidates.find(
      (candidate) =>
        candidate.link && canonicalUrl(candidate.link) === normalized,
    );
    if (match) return match;
  }
  return candidates.find(
    (candidate) => normalizeName(candidate.title) === normalizeName(item.title),
  );
}
