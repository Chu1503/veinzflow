type UpdateState = {
  status: "attempted" | "handled";
  timestamp: number;
};

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 10_000;
type GlobalWithLedger = typeof globalThis & {
  __veinzflowTelegramUpdateLedger__?: Map<string, UpdateState>;
};

const ledger = ((
  globalThis as GlobalWithLedger
).__veinzflowTelegramUpdateLedger__ ??= new Map<string, UpdateState>());

function prune(now: number): void {
  for (const [key, state] of ledger)
    if (now - state.timestamp >= TTL_MS) ledger.delete(key);
  while (ledger.size >= MAX_ENTRIES) {
    const oldest = ledger.keys().next().value as string | undefined;
    if (!oldest) break;
    ledger.delete(oldest);
  }
}

export function claimTelegramUpdate(
  updateId: string,
  now = Date.now(),
): boolean {
  prune(now);
  if (ledger.has(updateId)) return false;
  ledger.set(updateId, { status: "attempted", timestamp: now });
  return true;
}

export function markTelegramUpdateHandled(
  updateId: string,
  now = Date.now(),
): void {
  ledger.set(updateId, { status: "handled", timestamp: now });
}

export function resetTelegramUpdateLedger(): void {
  ledger.clear();
}
