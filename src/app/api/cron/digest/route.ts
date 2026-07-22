import { getEnv } from "@/config/env";
import { secretsEqual } from "@/security/authorization";
import { getNotionClient } from "@/notion/client";
import { getState, setState } from "@/notion/system-state";
import { DIGEST_STATE_KEY } from "@/config/constants";
import { isDigestDue } from "@/digest/schedule";
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
  if (!env.NOTION_SYSTEM_STATE_DATABASE_ID)
    return Response.json(
      { error: "Notion state is not configured" },
      { status: 503 },
    );
  const notion = getNotionClient();
  const last = await getState(
    notion,
    env.NOTION_SYSTEM_STATE_DATABASE_ID,
    DIGEST_STATE_KEY,
  );
  const now = new Date();
  if (!isDigestDue(last, now, env.APP_TIMEZONE))
    return Response.json({ ok: true, sent: false, reason: "not_due" });
  const since = last
    ? new Date(last)
    : new Date(now.getTime() - 2 * 86_400_000);
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
  await setState(
    notion,
    env.NOTION_SYSTEM_STATE_DATABASE_ID,
    DIGEST_STATE_KEY,
    now.toISOString(),
  );
  return Response.json({
    ok: true,
    sent: true,
    id: result.id,
    provider: result.provider,
  });
}
