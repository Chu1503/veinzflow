export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isUpstreamRateLimitError(error: unknown): boolean {
  if (!error || (typeof error !== "object" && typeof error !== "string"))
    return false;
  const record =
    typeof error === "object" ? (error as Record<string, unknown>) : undefined;
  const status = record?.status ?? record?.statusCode;
  const code = record?.code;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof record?.message === "string"
          ? record.message
          : "";
  return (
    status === 429 ||
    status === "429" ||
    code === 429 ||
    code === "429" ||
    code === "RESOURCE_EXHAUSTED" ||
    /(?:^|\D)429(?:\D|$)|rate[ -]?limit|quota exceeded|resource exhausted/i.test(
      message,
    )
  );
}
