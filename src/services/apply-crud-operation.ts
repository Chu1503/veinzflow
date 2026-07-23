import type { Client, PageObjectResponse } from "@notionhq/client";
import type { AppEnv } from "@/config/env";
import type { EntityType, ProjectUpdate } from "@/schemas/project-update";
import { mergeContactTopics } from "@/notion/contact-migration";
import { archivePage, updatePage, type WriteResult } from "@/notion/records";
import { multiSelectProperty, plainProperty, queryAll } from "@/notion/query";
import { getNotionUserMapping, resolveNotionUserId } from "@/notion/users";
import type { PageProperties } from "@/notion/mapping";
import { findRecordMatches, type RecordCandidate } from "./record-matching";

const title = (value: string) => ({
  title: [{ text: { content: value.slice(0, 2000) } }],
});
const text = (value: string | null) => ({
  rich_text: value ? [{ text: { content: value.slice(0, 2000) } }] : [],
});
const select = (value: string | null) => ({
  select: value ? { name: value } : null,
});
const multi = (values: string[]) => ({
  multi_select: values.map((name) => ({ name: name.slice(0, 100) })),
});

const ENTITY_CONFIG: Partial<
  Record<
    EntityType,
    {
      envKey: keyof AppEnv;
      titleProperty: string;
      singular: string;
      kind: WriteResult["kind"];
    }
  >
> = {
  CONTACT: {
    envKey: "NOTION_CONTACTS_DATABASE_ID",
    titleProperty: "Name",
    singular: "contact",
    kind: "contact",
  },
  RESOURCE: {
    envKey: "NOTION_RESOURCES_DATABASE_ID",
    titleProperty: "Title",
    singular: "resource",
    kind: "resource",
  },
  TASK: {
    envKey: "NOTION_TASKS_DATABASE_ID",
    titleProperty: "Task",
    singular: "task",
    kind: "task",
  },
  PROJECT_LOG: {
    envKey: "NOTION_PROJECT_LOG_DATABASE_ID",
    titleProperty: "Title",
    singular: "project log",
    kind: "log",
  },
};

function appendText(
  existing: string | null,
  incoming: string | null,
): string | null {
  const values = [existing, incoming]
    .flatMap((value) => value?.split(/\r?\n/) ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  return (
    values
      .filter((value) => {
        const key = value.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .join("\n") || null
  );
}

function ambiguityReply(
  singular: string,
  searchText: string | null,
  candidates: RecordCandidate[],
): string {
  const label = candidates.length === 1 ? singular : singular + "s";
  const choices = candidates
    .slice(0, 8)
    .map((candidate, index) => {
      const date = candidate.recordDate ?? candidate.createdTime.slice(0, 10);
      return index + 1 + ". " + candidate.title + " — " + date;
    })
    .join("\n");
  return (
    "I found " +
    candidates.length +
    " " +
    label +
    (searchText ? ' matching "' + searchText + '".' : ".") +
    "\n\nWhich one?\n\n" +
    choices
  );
}

function asCandidates(
  pages: PageObjectResponse[],
  titleProperty: string,
  entityType: EntityType,
): RecordCandidate[] {
  return pages.map((page) => ({
    id: page.id,
    title: plainProperty(page, titleProperty) ?? "Untitled",
    createdTime: page.created_time,
    recordDate:
      entityType === "PROJECT_LOG" ? plainProperty(page, "Date") : null,
  }));
}

async function contactChanges(
  page: PageObjectResponse,
  update: ProjectUpdate,
): Promise<PageProperties> {
  const changes = update.changes;
  const properties: PageProperties = {};
  if (changes.name) properties.Name = title(changes.name);
  if (changes.contactDetails)
    properties["Contact Details"] = text(
      appendText(
        plainProperty(page, "Contact Details"),
        changes.contactDetails,
      ),
    );
  if (changes.contactStatus)
    properties["Contact Status"] = select(changes.contactStatus);
  if (changes.couldHelpWith)
    properties["Could Help With"] = multi(
      mergeContactTopics(
        multiSelectProperty(page, "Could Help With"),
        changes.couldHelpWith,
      ),
    );
  if (changes.notes)
    properties.Notes = text(
      appendText(plainProperty(page, "Notes"), changes.notes),
    );
  return properties;
}

async function resourceChanges(update: ProjectUpdate): Promise<PageProperties> {
  const changes = update.changes;
  const properties: PageProperties = {};
  if (changes.title) properties.Title = title(changes.title);
  if (changes.resourceType)
    properties["Resource Type"] = select(changes.resourceType);
  if (changes.link) properties.Link = { url: changes.link };
  if (changes.description) properties.Description = text(changes.description);
  if (changes.notes) properties.Notes = text(changes.notes);
  return properties;
}

async function taskChanges(
  client: Client,
  env: AppEnv,
  page: PageObjectResponse,
  update: ProjectUpdate,
): Promise<PageProperties> {
  const changes = update.changes;
  const properties: PageProperties = {};
  if (changes.title) properties.Task = title(changes.title);
  if (changes.taskStatus) properties.Status = select(changes.taskStatus);
  if (changes.assignedToName) {
    const mapping = await getNotionUserMapping(client, env.teamMembers);
    const notionUserId = resolveNotionUserId(
      changes.assignedToName,
      env.teamMembers,
      mapping,
    );
    if (notionUserId)
      properties["Assigned To"] = { people: [{ id: notionUserId }] };
  }
  if (changes.notes)
    await client.blocks.children.append({
      block_id: page.id,
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { type: "text", text: { content: changes.notes.slice(0, 2000) } },
            ],
          },
        },
      ],
    });
  return properties;
}

async function projectLogChanges(
  page: PageObjectResponse,
  update: ProjectUpdate,
): Promise<PageProperties> {
  const changes = update.changes;
  const properties: PageProperties = {};
  if (changes.title) properties.Title = title(changes.title);
  if (changes.date) properties.Date = { date: { start: changes.date } };
  if (changes.outcome || changes.notes)
    properties.Outcome = text(
      appendText(
        plainProperty(page, "Outcome"),
        changes.outcome ?? changes.notes,
      ),
    );
  if (changes.nextSteps)
    properties["Next Steps"] = text(changes.nextSteps.join("\n"));
  if (changes.questions)
    properties.Questions = text(changes.questions.join("\n"));
  return properties;
}

function updatedTitle(
  page: PageObjectResponse,
  titleProperty: string,
  update: ProjectUpdate,
): string {
  return (
    update.changes.name ??
    update.changes.title ??
    plainProperty(page, titleProperty) ??
    "Untitled"
  );
}

export async function applyCrudOperation(
  client: Client,
  env: AppEnv,
  update: ProjectUpdate,
): Promise<{ reply: string; result?: WriteResult }> {
  const config = ENTITY_CONFIG[update.entityType];
  if (!config) return { reply: "I couldn't find anything matching that." };
  const dataSourceId = env[config.envKey];
  if (typeof dataSourceId !== "string" || !dataSourceId)
    throw new Error(String(config.envKey) + " is not configured");
  const pages = await queryAll(client, dataSourceId);
  const match = findRecordMatches(
    asCandidates(pages, config.titleProperty, update.entityType),
    update.searchText,
    update.entityId,
  );
  if (match.kind === "none")
    return { reply: "I couldn't find anything matching that." };
  if (match.kind === "many")
    return {
      reply: ambiguityReply(
        config.singular,
        update.searchText,
        match.candidates,
      ),
    };
  const page = pages.find((candidate) => candidate.id === match.candidate.id)!;
  if (update.intent === "DELETE") {
    await archivePage(client, page.id);
    const verb = update.entityType === "PROJECT_LOG" ? "Archived" : "Deleted";
    return {
      reply:
        "✅ " +
        verb +
        " " +
        config.singular +
        ' "' +
        match.candidate.title +
        '".',
      result: {
        kind: config.kind,
        title: match.candidate.title,
        action: "archived",
        id: page.id,
      },
    };
  }
  if (update.intent !== "UPDATE")
    return { reply: "I couldn't determine what change to make." };

  const properties =
    update.entityType === "CONTACT"
      ? await contactChanges(page, update)
      : update.entityType === "RESOURCE"
        ? await resourceChanges(update)
        : update.entityType === "TASK"
          ? await taskChanges(client, env, page, update)
          : await projectLogChanges(page, update);
  if (!Object.keys(properties).length && !update.changes.notes)
    return {
      reply:
        "I found " +
        match.candidate.title +
        ", but I need the change you want to make.",
    };
  if (Object.keys(properties).length)
    await updatePage(client, page.id, properties);
  const finalTitle = updatedTitle(page, config.titleProperty, update);
  return {
    reply: "✅ Updated " + finalTitle + ".",
    result: {
      kind: config.kind,
      title: finalTitle,
      action: "updated",
      id: page.id,
    },
  };
}
