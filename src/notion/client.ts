import { Client } from "@notionhq/client";
import { getEnv } from "@/config/env";
import { logger } from "@/lib/logger";
import { getNotionUserMapping } from "./users";
let client: Client | undefined;
export function getNotionClient(): Client {
  if (!client) {
    const env = getEnv();
    const token = env.NOTION_TOKEN;
    if (!token) throw new Error("NOTION_TOKEN is not configured");
    client = new Client({ auth: token });
    void getNotionUserMapping(client, env.teamMembers).catch((error) =>
      logger.warn("Initial Notion user lookup failed; assignment will retry", {
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
  }
  return client;
}
