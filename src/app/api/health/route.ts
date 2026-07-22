import { getEnv } from "@/config/env";
export const runtime = "nodejs";
export async function GET() {
  const env = getEnv();
  return Response.json({
    status: "ok",
    app: env.APP_NAME,
    services: {
      telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET),
      notion: Boolean(
        env.NOTION_TOKEN &&
        env.NOTION_CONTACTS_DATABASE_ID &&
        env.NOTION_RESOURCES_DATABASE_ID &&
        env.NOTION_TASKS_DATABASE_ID &&
        env.NOTION_PROJECT_LOG_DATABASE_ID &&
        env.NOTION_SYSTEM_STATE_DATABASE_ID,
      ),
      transcription: env.TRANSCRIPTION_PROVIDER,
      extraction: env.EXTRACTION_PROVIDER,
      digest: env.DIGEST_PROVIDER,
      email: env.EMAIL_PROVIDER,
      teamConfigured: env.teamMembers.length > 0,
    },
    timestamp: new Date().toISOString(),
  });
}
