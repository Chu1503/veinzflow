export async function retry<T>(
  operation: () => Promise<T>,
  attempts = 2,
  delayMs = 150,
): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      last = error;
      if (attempt < attempts)
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * 2 ** (attempt - 1)),
        );
    }
  }
  throw last;
}
