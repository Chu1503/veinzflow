import { Client } from "@notionhq/client";
import { getEnv } from "@/config/env";
let client: Client | undefined;
export function getNotionClient(): Client {
  if (!client) {
    const token = getEnv().NOTION_TOKEN;
    if (!token) throw new Error("NOTION_TOKEN is not configured");
    client = new Client({ auth: token });
  }
  return client;
}
