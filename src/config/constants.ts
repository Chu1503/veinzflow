export const APP_DEFAULTS = {
  name: "VeinzFlow",
  timezone: "America/Chicago",
  maxAudioDurationSeconds: 600,
  maxAudioBytes: 20_000_000,
  maxTextLength: 20_000,
  maxAiAttempts: 2,
} as const;

export const SOURCE = "Telegram";
export const SCHEMA_VERSION = "1";
