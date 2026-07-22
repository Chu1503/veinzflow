import { z } from "zod";
import { getEnv } from "@/config/env";
import { secretsEqual } from "@/security/authorization";
import { createExtractionProvider } from "@/ai/extraction";
import { dateInTimezone } from "@/lib/dates";
export const runtime = "nodejs";
const bodySchema = z.object({
  text: z.string().min(1).max(20_000),
  sourceMessageId: z.string().default("admin-test"),
  submittedBy: z.string().default("Admin"),
});
export async function POST(request: Request) {
  const env = getEnv();
  if (
    !secretsEqual(
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null,
      env.ADMIN_SECRET,
    )
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = bodySchema.parse(await request.json());
    const result = await createExtractionProvider(env).extract({
      ...body,
      currentDate: dateInTimezone(new Date(), env.APP_TIMEZONE),
      timezone: env.APP_TIMEZONE,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Extraction failed" },
      { status: 400 },
    );
  }
}
