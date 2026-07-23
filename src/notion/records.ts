import type {
  Client,
  CreatePageParameters,
  PageObjectResponse,
} from "@notionhq/client";
import type { AppEnv } from "@/config/env";
import type {
  ContactUpdate,
  ProjectLogEntryInput,
  ResourceUpdate,
  TaskUpdate,
} from "@/schemas/project-update";
import { retry } from "@/lib/retry";
import {
  findContactDuplicate,
  findResourceDuplicate,
  normalizeName,
} from "@/services/deduplicate";
import {
  mapContact,
  mapProjectLog,
  mapResource,
  mapTask,
  taskChildren,
  type PageProperties,
} from "./mapping";
import { plainProperty, queryAll } from "./query";
import { resolveNotionUserId, type NotionUserMapping } from "./users";

export type WriteResult = {
  kind: "contact" | "resource" | "task" | "log";
  title: string;
  action: "created" | "updated" | "archived" | "skipped";
  id?: string;
};
const parent = (id: string) => ({
  type: "data_source_id" as const,
  data_source_id: id,
});
function configured(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}
function withoutEmpty(properties: PageProperties): PageProperties {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => {
      const record = value as Record<string, unknown>;
      if ("rich_text" in record)
        return (record.rich_text as unknown[]).length > 0;
      if ("title" in record) return true;
      if ("people" in record) return (record.people as unknown[]).length > 0;
      if ("multi_select" in record)
        return (record.multi_select as unknown[]).length > 0;
      if ("date" in record) return record.date !== null;
      if ("url" in record) return record.url !== null;
      if ("email" in record) return record.email !== null;
      if ("phone_number" in record) return record.phone_number !== null;
      return true;
    }),
  ) as PageProperties;
}
async function create(
  client: Client,
  dataSourceId: string,
  properties: PageProperties,
  children?: CreatePageParameters["children"],
): Promise<PageObjectResponse> {
  return retry(
    () =>
      client.pages.create({
        parent: parent(dataSourceId),
        properties,
        ...(children ? { children } : {}),
      }),
    3,
  ) as Promise<PageObjectResponse>;
}
export async function updatePage(
  client: Client,
  pageId: string,
  properties: PageProperties,
): Promise<PageObjectResponse> {
  return retry(
    () =>
      client.pages.update({
        page_id: pageId,
        properties: withoutEmpty(properties),
      }),
    3,
  ) as Promise<PageObjectResponse>;
}

export async function archivePage(
  client: Client,
  pageId: string,
): Promise<PageObjectResponse> {
  return retry(
    () => client.pages.update({ page_id: pageId, archived: true }),
    3,
  ) as Promise<PageObjectResponse>;
}

export async function upsertContact(
  client: Client,
  env: AppEnv,
  item: ContactUpdate,
): Promise<WriteResult> {
  const id = configured(
    env.NOTION_CONTACTS_DATABASE_ID,
    "NOTION_CONTACTS_DATABASE_ID",
  );
  const candidates = await queryAll(client, id);
  const duplicate = findContactDuplicate(
    item,
    candidates.map((page) => ({
      id: page.id,
      name: plainProperty(page, "Name") ?? "",
      contactDetails: plainProperty(page, "Contact Details"),
    })),
  );
  const properties = mapContact(item);
  const page = duplicate
    ? await updatePage(client, duplicate.id, properties)
    : await create(client, id, properties);
  return {
    kind: "contact",
    title: item.name,
    action: duplicate ? "updated" : "created",
    id: page.id,
  };
}
export async function upsertResource(
  client: Client,
  env: AppEnv,
  item: ResourceUpdate,
): Promise<WriteResult> {
  const id = configured(
    env.NOTION_RESOURCES_DATABASE_ID,
    "NOTION_RESOURCES_DATABASE_ID",
  );
  const candidates = await queryAll(client, id);
  const duplicate = findResourceDuplicate(
    item,
    candidates.map((page) => ({
      id: page.id,
      title: plainProperty(page, "Title") ?? "",
      link: plainProperty(page, "Link"),
    })),
  );
  const page = duplicate
    ? await updatePage(client, duplicate.id, mapResource(item))
    : await create(client, id, mapResource(item));
  return {
    kind: "resource",
    title: item.title,
    action: duplicate ? "updated" : "created",
    id: page.id,
  };
}
export async function createTask(
  client: Client,
  env: AppEnv,
  item: TaskUpdate,
  userMapping: NotionUserMapping,
): Promise<WriteResult> {
  const id = configured(
    env.NOTION_TASKS_DATABASE_ID,
    "NOTION_TASKS_DATABASE_ID",
  );
  const existing = (await queryAll(client, id)).find(
    (page) =>
      normalizeName(plainProperty(page, "Task") ?? "") ===
      normalizeName(item.title),
  );
  if (existing)
    return {
      kind: "task",
      title: item.title,
      action: "skipped",
      id: existing.id,
    };
  const assigneeId = resolveNotionUserId(
    item.assignedToName,
    env.teamMembers,
    userMapping,
  );
  const page = await create(
    client,
    id,
    mapTask(item, assigneeId || undefined),
    item.notes ? taskChildren(item) : undefined,
  );
  return { kind: "task", title: item.title, action: "created", id: page.id };
}
export async function createProjectLog(
  client: Client,
  env: AppEnv,
  item: ProjectLogEntryInput,
): Promise<WriteResult> {
  const id = configured(
    env.NOTION_PROJECT_LOG_DATABASE_ID,
    "NOTION_PROJECT_LOG_DATABASE_ID",
  );
  const existing = (await queryAll(client, id)).find(
    (page) =>
      normalizeName(plainProperty(page, "Title") ?? "") ===
        normalizeName(item.title) && plainProperty(page, "Date") === item.date,
  );
  if (existing)
    return {
      kind: "log",
      title: item.title,
      action: "skipped",
      id: existing.id,
    };
  const page = await create(client, id, mapProjectLog(item));
  return { kind: "log", title: item.title, action: "created", id: page.id };
}
