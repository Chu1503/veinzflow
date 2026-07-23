import {
  isFullPage,
  type Client,
  type PageObjectResponse,
} from "@notionhq/client";
import { retry } from "@/lib/retry";

export async function queryEquals(
  client: Client,
  dataSourceId: string,
  property: string,
  kind: "rich_text" | "title" | "email" | "url",
  value: string,
): Promise<PageObjectResponse[]> {
  const filter = { property, [kind]: { equals: value } } as Parameters<
    Client["dataSources"]["query"]
  >[0]["filter"];
  const response = await retry(
    () => client.dataSources.query({ data_source_id: dataSourceId, filter }),
    3,
  );
  return response.results.filter(isFullPage);
}

export async function queryAll(
  client: Client,
  dataSourceId: string,
  filter?: Parameters<Client["dataSources"]["query"]>[0]["filter"],
): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;
  do {
    const response = await retry(
      () =>
        client.dataSources.query({
          data_source_id: dataSourceId,
          page_size: 100,
          ...(filter ? { filter } : {}),
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      3,
    );
    pages.push(...response.results.filter(isFullPage));
    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);
  return pages;
}

export function plainProperty(
  page: PageObjectResponse,
  name: string,
): string | null {
  const property = page.properties[name];
  if (!property) return null;
  if (property.type === "title")
    return property.title.map((item) => item.plain_text).join("") || null;
  if (property.type === "rich_text")
    return property.rich_text.map((item) => item.plain_text).join("") || null;
  if (property.type === "email") return property.email;
  if (property.type === "url") return property.url;
  if (property.type === "select") return property.select?.name ?? null;
  if (property.type === "date") return property.date?.start ?? null;
  return null;
}

export function multiSelectProperty(
  page: PageObjectResponse,
  name: string,
): string[] {
  const property = page.properties[name];
  return property?.type === "multi_select"
    ? property.multi_select.map((item) => item.name)
    : [];
}
