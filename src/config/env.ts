import { z } from "zod";
import { APP_DEFAULTS } from "./constants";

const teamMemberSchema = z.object({
  name: z.string().min(1),
  telegramUserId: z.string().min(1),
  notionUserId: z.string().min(1).optional().or(z.literal("")),
  email: z.string().email(),
  aliases: z.array(z.string()).default([]),
});

const baseSchema = z.object({
  APP_NAME: z.string().default(APP_DEFAULTS.name),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_TIMEZONE: z.string().default(APP_DEFAULTS.timezone),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  ALLOWED_TELEGRAM_CHAT_IDS: z.string().default(""),
  TEAM_MEMBERS_JSON: z.string().default("[]"),
  NOTION_TOKEN: z.string().optional(),
  NOTION_PARENT_PAGE_ID: z.string().optional(),
  NOTION_CONTACTS_DATABASE_ID: z.string().optional(),
  NOTION_RESOURCES_DATABASE_ID: z.string().optional(),
  NOTION_TASKS_DATABASE_ID: z.string().optional(),
  NOTION_PROJECT_LOG_DATABASE_ID: z.string().optional(),
  NOTION_SYSTEM_STATE_DATABASE_ID: z.string().optional(),
  TRANSCRIPTION_PROVIDER: z.enum(["openai", "groq"]).default("groq"),
  EXTRACTION_PROVIDER: z
    .enum(["openai", "anthropic", "gemini"])
    .default("gemini"),
  DIGEST_PROVIDER: z.enum(["openai", "anthropic", "gemini"]).default("gemini"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_TRANSCRIPTION_MODEL: z.string().default("gpt-4o-mini-transcribe"),
  OPENAI_EXTRACTION_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_DIGEST_MODEL: z.string().default("gpt-4.1-mini"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_TRANSCRIPTION_MODEL: z.string().default("whisper-large-v3-turbo"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_EXTRACTION_MODEL: z.string().default("claude-3-5-haiku-latest"),
  ANTHROPIC_DIGEST_MODEL: z.string().default("claude-3-5-haiku-latest"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_EXTRACTION_MODEL: z.string().default("gemini-3.5-flash"),
  GEMINI_DIGEST_MODEL: z.string().default("gemini-3.5-flash"),
  EMAIL_PROVIDER: z.enum(["gmail", "resend"]).default("gmail"),
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),
  GMAIL_SENDER_EMAIL: z.string().email().optional().or(z.literal("")),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional().or(z.literal("")),
  CRON_SECRET: z.string().optional(),
  ADMIN_SECRET: z.string().optional(),
  MAX_AUDIO_DURATION_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(APP_DEFAULTS.maxAudioDurationSeconds),
  MAX_AUDIO_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(APP_DEFAULTS.maxAudioBytes),
  MAX_TEXT_LENGTH: z.coerce
    .number()
    .int()
    .positive()
    .default(APP_DEFAULTS.maxTextLength),
  MAX_AI_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(5)
    .default(APP_DEFAULTS.maxAiAttempts),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;
export type AppEnv = z.infer<typeof baseSchema> & {
  teamMembers: TeamMember[];
  allowedTelegramChatIds: string[];
};

export function parseEnv(
  source: NodeJS.ProcessEnv = process.env,
  strict = false,
): AppEnv {
  const env = baseSchema.parse(source);
  let teamMembers: TeamMember[];
  try {
    teamMembers = z
      .array(teamMemberSchema)
      .parse(JSON.parse(env.TEAM_MEMBERS_JSON));
  } catch (error) {
    throw new Error(
      `TEAM_MEMBERS_JSON is invalid: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
  if (strict) {
    const required = [
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_WEBHOOK_SECRET",
      "NOTION_TOKEN",
      "CRON_SECRET",
    ] as const;
    for (const key of required)
      if (!env[key]) throw new Error(`${key} is required`);
    if (
      (env.TRANSCRIPTION_PROVIDER === "openai" ||
        env.EXTRACTION_PROVIDER === "openai" ||
        env.DIGEST_PROVIDER === "openai") &&
      !env.OPENAI_API_KEY
    )
      throw new Error("OPENAI_API_KEY is required");
    if (env.TRANSCRIPTION_PROVIDER === "groq" && !env.GROQ_API_KEY)
      throw new Error("GROQ_API_KEY is required");
    if (
      (env.EXTRACTION_PROVIDER === "anthropic" ||
        env.DIGEST_PROVIDER === "anthropic") &&
      !env.ANTHROPIC_API_KEY
    )
      throw new Error("ANTHROPIC_API_KEY is required");
    if (
      (env.EXTRACTION_PROVIDER === "gemini" ||
        env.DIGEST_PROVIDER === "gemini") &&
      !env.GEMINI_API_KEY
    )
      throw new Error("GEMINI_API_KEY is required");
    if (
      env.EMAIL_PROVIDER === "resend" &&
      (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL)
    )
      throw new Error("Resend configuration is required");
    if (
      env.EMAIL_PROVIDER === "gmail" &&
      (!env.GMAIL_CLIENT_ID ||
        !env.GMAIL_CLIENT_SECRET ||
        !env.GMAIL_REFRESH_TOKEN ||
        !env.GMAIL_SENDER_EMAIL)
    )
      throw new Error("Gmail configuration is required");
  }
  return {
    ...env,
    teamMembers,
    allowedTelegramChatIds: env.ALLOWED_TELEGRAM_CHAT_IDS.split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  };
}

export function getEnv(): AppEnv {
  return parseEnv(process.env);
}
