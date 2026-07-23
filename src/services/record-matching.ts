export type RecordCandidate = {
  id: string;
  title: string;
  createdTime: string;
  recordDate?: string | null;
};

export type MatchResult =
  | { kind: "none" }
  | { kind: "one"; candidate: RecordCandidate }
  | { kind: "many"; candidates: RecordCandidate[] };

const IGNORED_WORDS = new Set([
  "delete",
  "remove",
  "erase",
  "archive",
  "edit",
  "update",
  "change",
  "contact",
  "contacts",
  "task",
  "tasks",
  "project",
  "projects",
  "log",
  "logs",
  "entry",
  "meeting",
  "meetings",
  "the",
  "a",
  "an",
  "from",
]);

function singularize(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .join(" ");
}

function searchTerms(value: string): string[] {
  return normalizeSearchText(value)
    .split(" ")
    .filter((word) => word && !IGNORED_WORDS.has(word));
}

function dateKey(value: string): string {
  return value.slice(0, 10);
}

function relativeDate(now: Date, offsetDays: number): string {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function recencySort(candidates: RecordCandidate[]): RecordCandidate[] {
  return [...candidates].sort(
    (left, right) =>
      Date.parse(right.createdTime) - Date.parse(left.createdTime),
  );
}

export function findRecordMatches(
  candidates: RecordCandidate[],
  searchText: string | null | undefined,
  entityId?: string | null,
  now = new Date(),
): MatchResult {
  if (entityId) {
    const direct = candidates.find((candidate) => candidate.id === entityId);
    return direct ? { kind: "one", candidate: direct } : { kind: "none" };
  }
  const raw = searchText?.trim() ?? "";
  const recentReference = /\b(last|latest|previous)\b|just added/i.test(raw);
  const wantedDate = /\byesterday\b/i.test(raw)
    ? relativeDate(now, -1)
    : /\btoday(?:'s)?\b/i.test(raw)
      ? relativeDate(now, 0)
      : null;
  const pool = wantedDate
    ? candidates.filter(
        (candidate) =>
          dateKey(candidate.recordDate ?? candidate.createdTime) === wantedDate,
      )
    : candidates;
  const terms = searchTerms(raw).filter(
    (word) =>
      ![
        "last",
        "latest",
        "previous",
        "today",
        "yesterday",
        "just",
        "added",
        "my",
        "i",
      ].includes(word),
  );
  if (!terms.length) {
    if ((recentReference || wantedDate) && pool.length)
      return { kind: "one", candidate: recencySort(pool)[0]! };
    return { kind: "none" };
  }
  const query = terms.join(" ");
  const exact = pool.filter(
    (candidate) => normalizeSearchText(candidate.title) === query,
  );
  if (exact.length === 1) return { kind: "one", candidate: exact[0]! };
  if (exact.length > 1) return { kind: "many", candidates: recencySort(exact) };

  const scored = pool
    .map((candidate) => {
      const title = normalizeSearchText(candidate.title);
      const titleTerms = new Set(title.split(" "));
      const overlap = terms.filter((term) => titleTerms.has(term)).length;
      const score =
        title.includes(query) || query.includes(title)
          ? 1
          : overlap / Math.max(terms.length, titleTerms.size);
      return { candidate, score };
    })
    .filter((item) => item.score >= 0.5)
    .sort(
      (left, right) =>
        right.score - left.score ||
        Date.parse(right.candidate.createdTime) -
          Date.parse(left.candidate.createdTime),
    );
  if (!scored.length) return { kind: "none" };
  const best = scored[0]!.score;
  const bestMatches = scored
    .filter((item) => item.score === best)
    .map((item) => item.candidate);
  if (bestMatches.length === 1)
    return { kind: "one", candidate: bestMatches[0]! };
  return { kind: "many", candidates: bestMatches };
}
