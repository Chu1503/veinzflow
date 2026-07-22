import { getEnv } from "@/config/env";
import { secretsEqual } from "@/security/authorization";
import { getNotionClient } from "@/notion/client";
import { isDigestScheduledDay } from "@/digest/schedule";
import { collectDigest } from "@/digest/collect";
import { createDigestProvider } from "@/ai/digest";
import { generateDigestWithFallback } from "@/digest/generate";
import { createEmailProvider } from "@/email";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const env = getEnv();
  const authorization =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!secretsEqual(authorization, env.CRON_SECRET))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const notion = getNotionClient();
  const now = new Date();
  if (!isDigestScheduledDay(now, env.APP_TIMEZONE))
    return Response.json({ ok: true, sent: false, reason: "not_due" });
  const since = new Date(now.getTime() - 2 * 86_400_000);
  const data = await collectDigest(notion, env, since, now);
  const digest = await generateDigestWithFallback(
    createDigestProvider(env),
    data,
  );
  const recipients = env.teamMembers.map((member) => member.email);
  if (!recipients.length)
    return Response.json(
      { error: "No recipients configured" },
      { status: 503 },
    );
  const result = await createEmailProvider(env).sendDigest({
    recipients,
    ...digest,
  });
  return Response.json({
    ok: true,
    sent: true,
    id: result.id,
    provider: result.provider,
  });
}
