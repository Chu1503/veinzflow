import type { Client, PageObjectResponse } from "@notionhq/client";
import { describe, expect, it } from "vitest";
import { markUpdateProcessed } from "@/notion/system-state";
describe("Telegram idempotency", () => {
  it("creates a marker once and rejects a repeat", async () => {
    let stored = false;
    const page = {
      object: "page",
      id: "p",
      created_time: "",
      last_edited_time: "",
      created_by: { object: "user", id: "u" },
      last_edited_by: { object: "user", id: "u" },
      cover: null,
      icon: null,
      parent: {
        type: "data_source_id",
        data_source_id: "d",
        database_id: "db",
      },
      archived: false,
      in_trash: false,
      is_locked: false,
      properties: {
        Value: {
          id: "v",
          type: "rich_text",
          rich_text: [
            {
              type: "text",
              text: { content: "time", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "time",
              href: null,
            },
          ],
        },
      },
      url: "",
      public_url: null,
    } as unknown as PageObjectResponse;
    const client = {
      dataSources: { query: async () => ({ results: stored ? [page] : [] }) },
      pages: {
        create: async () => {
          stored = true;
          return page;
        },
        update: async () => page,
      },
    } as unknown as Client;
    expect(await markUpdateProcessed(client, "state", "9")).toBe(true);
    expect(await markUpdateProcessed(client, "state", "9")).toBe(false);
  });
});
