import { describe, expect, it, vi } from "vitest";
import type { Client, PageObjectResponse } from "@notionhq/client";
import type { AppEnv } from "@/config/env";
import { applyCrudOperation } from "@/services/apply-crud-operation";
import { projectUpdateSchema } from "@/schemas/project-update";

function page(
  id: string,
  name: string,
  createdTime = "2026-07-23T10:00:00.000Z",
): PageObjectResponse {
  return {
    object: "page",
    id,
    created_time: createdTime,
    last_edited_time: createdTime,
    created_by: { object: "user", id: "user" },
    last_edited_by: { object: "user", id: "user" },
    cover: null,
    icon: null,
    parent: {
      type: "data_source_id",
      data_source_id: "contacts",
      database_id: "db",
    },
    archived: false,
    is_archived: false,
    in_trash: false,
    is_locked: false,
    properties: {
      Name: {
        id: "title",
        type: "title",
        title: [
          {
            type: "text",
            text: { content: name, link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: name,
            href: null,
          },
        ],
      },
      "Contact Details": {
        id: "details",
        type: "rich_text",
        rich_text: [
          {
            type: "text",
            text: { content: "sandra@example.com", link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: "sandra@example.com",
            href: null,
          },
        ],
      },
      "Could Help With": {
        id: "help",
        type: "multi_select",
        multi_select: [{ id: "ai", name: "AI", color: "default" }],
      },
      Notes: { id: "notes", type: "rich_text", rich_text: [] },
    },
    url: "https://notion.so/" + id,
    public_url: null,
  } as PageObjectResponse;
}

function client(pages: PageObjectResponse[]) {
  const update = vi.fn(async (input) => ({ ...pages[0], id: input.page_id }));
  return {
    dataSources: {
      query: vi.fn(async () => ({
        object: "list",
        type: "page_or_data_source",
        page_or_data_source: {},
        results: pages,
        has_more: false,
        next_cursor: null,
      })),
    },
    pages: { update },
    blocks: { children: { append: vi.fn() } },
  } as unknown as Client & { pages: { update: ReturnType<typeof vi.fn> } };
}

const env = {
  NOTION_CONTACTS_DATABASE_ID: "contacts",
  NOTION_RESOURCES_DATABASE_ID: "resources",
  NOTION_TASKS_DATABASE_ID: "tasks",
  NOTION_PROJECT_LOG_DATABASE_ID: "logs",
  teamMembers: [],
} as unknown as AppEnv;

function operation(input: Record<string, unknown>) {
  return projectUpdateSchema.parse({
    intent: "UPDATE",
    entityType: "CONTACT",
    entityId: null,
    searchText: "Sandra",
    changes: {},
    submissionSummary: "Update Sandra",
    contacts: [],
    resources: [],
    tasks: [],
    logEntries: [],
    uncertainties: [],
    confidence: 1,
    needsConfirmation: false,
    ...input,
  });
}

describe("natural CRUD operations", () => {
  it("appends contact details and merges Could Help With", async () => {
    const notion = client([page("contact-1", "Sandra")]);
    const result = await applyCrudOperation(
      notion,
      env,
      operation({
        changes: {
          contactDetails: "+1 555 0100",
          couldHelpWith: ["AI", "Computer Vision"],
        },
      }),
    );
    expect(result.reply).toBe("✅ Updated Sandra.");
    expect(notion.pages.update).toHaveBeenCalledWith(
      expect.objectContaining({
        page_id: "contact-1",
        properties: expect.objectContaining({
          "Contact Details": {
            rich_text: [
              { text: { content: "sandra@example.com\n+1 555 0100" } },
            ],
          },
          "Could Help With": {
            multi_select: [{ name: "AI" }, { name: "Computer Vision" }],
          },
        }),
      }),
    );
  });

  it("archives a uniquely matched record instead of creating one", async () => {
    const notion = client([page("contact-1", "Sandra")]);
    const result = await applyCrudOperation(
      notion,
      env,
      operation({ intent: "DELETE", changes: {} }),
    );
    expect(result.reply).toBe('✅ Deleted contact "Sandra".');
    expect(notion.pages.update).toHaveBeenCalledWith({
      page_id: "contact-1",
      archived: true,
    });
  });

  it("asks for clarification when an edit or delete is ambiguous", async () => {
    const notion = client([
      page("1", "Alex", "2026-07-22T10:00:00.000Z"),
      page("2", "Alex", "2026-07-23T10:00:00.000Z"),
    ]);
    const result = await applyCrudOperation(
      notion,
      env,
      operation({ intent: "DELETE", searchText: "Alex", changes: {} }),
    );
    expect(result.reply).toContain("I found 2 contacts");
    expect(result.reply).toContain("Which one?");
    expect(notion.pages.update).not.toHaveBeenCalled();
  });
});
