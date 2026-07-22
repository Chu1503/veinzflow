import type { Client } from "@notionhq/client";
import { queryEquals, plainProperty } from "./query";
import { retry } from "@/lib/retry";

export async function getState(
  client: Client,
  dataSourceId: string,
  key: string,
): Promise<string | null> {
  const pages = await queryEquals(client, dataSourceId, "Key", "title", key);
  return pages[0] ? plainProperty(pages[0], "Value") : null;
}
export async function setState(
  client: Client,
  dataSourceId: string,
  key: string,
  value: string,
): Promise<void> {
  const pages = await queryEquals(client, dataSourceId, "Key", "title", key);
  const properties = {
    Key: { title: [{ text: { content: key } }] },
    Value: { rich_text: [{ text: { content: value } }] },
  };
  if (pages[0])
    await retry(
      () => client.pages.update({ page_id: pages[0]!.id, properties }),
      3,
    );
  else
    await retry(
      () =>
        client.pages.create({
          parent: { type: "data_source_id", data_source_id: dataSourceId },
          properties,
        }),
      3,
    );
}
export async function markUpdateProcessed(
  client: Client,
  dataSourceId: string,
  updateId: string,
): Promise<boolean> {
  const key = `telegram_update:${updateId}`;
  if (await getState(client, dataSourceId, key)) return false;
  await setState(client, dataSourceId, key, new Date().toISOString());
  return true;
}
