import { getEnv } from "@/config/env";
import { getNotionClient } from "@/notion/client";
import { refreshNotionUserMapping } from "@/notion/users";
import { secretsEqual } from "@/security/authorization";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const env = getEnv();
  const authorization =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!secretsEqual(authorization, env.ADMIN_SECRET))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const mapping = await refreshNotionUserMapping(
    getNotionClient(),
    env.teamMembers,
  );
  return Response.json({
    ok: true,
    matched: mapping.size,
    configured: env.teamMembers.length,
  });
}
