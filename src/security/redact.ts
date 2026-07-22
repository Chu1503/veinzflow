const SECRET_PATTERN = /(token|secret|api[-_]?key|authorization)/i;
export function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SECRET_PATTERN.test(key) ? "[REDACTED]" : redact(item),
    ]),
  );
}
