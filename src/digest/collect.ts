import type { Client, PageObjectResponse } from "@notionhq/client";
import type { AppEnv } from "@/config/env";
import type { DigestInput } from "@/schemas/digest";
import { queryAll, plainProperty } from "@/notion/query";
const required = (value: string | undefined, name: string) => {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};
const createdSince = (page: PageObjectResponse, since: Date) =>
  new Date(page.created_time) >= since;
const title = (page: PageObjectResponse, property: string) =>
  plainProperty(page, property) ?? "Untitled";
export async function collectDigest(
  client: Client,
  env: AppEnv,
  since: Date,
  now: Date,
): Promise<DigestInput> {
  const [logs, tasks, contacts, resources] = await Promise.all([
    queryAll(
      client,
      required(
        env.NOTION_PROJECT_LOG_DATABASE_ID,
        "NOTION_PROJECT_LOG_DATABASE_ID",
      ),
    ),
    queryAll(
      client,
      required(env.NOTION_TASKS_DATABASE_ID, "NOTION_TASKS_DATABASE_ID"),
    ),
    queryAll(
      client,
      required(env.NOTION_CONTACTS_DATABASE_ID, "NOTION_CONTACTS_DATABASE_ID"),
    ),
    queryAll(
      client,
      required(
        env.NOTION_RESOURCES_DATABASE_ID,
        "NOTION_RESOURCES_DATABASE_ID",
      ),
    ),
  ]);
  const today = now.toISOString().slice(0, 10);
  const nextWeek = new Date(now.getTime() + 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const due = (page: PageObjectResponse) => plainProperty(page, "Due Date");
  const status = (page: PageObjectResponse) => plainProperty(page, "Status");
  return {
    periodStart: since.toISOString(),
    periodEnd: now.toISOString(),
    logEntries: logs
      .filter((page) => createdSince(page, since))
      .map((page) => title(page, "Entry Title")),
    completedTasks: tasks
      .filter((page) => status(page) === "Done" && createdSince(page, since))
      .map((page) => title(page, "Task")),
    upcomingTasks: tasks
      .filter((page) => {
        const value = due(page);
        return (
          value &&
          value >= today &&
          value <= nextWeek &&
          status(page) !== "Done"
        );
      })
      .map((page) => `${title(page, "Task")} — due ${due(page)}`),
    overdueTasks: tasks
      .filter((page) => {
        const value = due(page);
        return (
          value &&
          value < today &&
          !["Done", "Cancelled"].includes(status(page) ?? "")
        );
      })
      .map((page) => `${title(page, "Task")} — due ${due(page)}`),
    blockedTasks: tasks
      .filter((page) => status(page) === "Blocked")
      .map((page) => title(page, "Task")),
    unassignedHighPriorityTasks: tasks
      .filter(
        (page) =>
          ["Critical", "High"].includes(
            plainProperty(page, "Priority") ?? "",
          ) &&
          page.properties["Assigned To"]?.type === "people" &&
          page.properties["Assigned To"].people.length === 0,
      )
      .map((page) => title(page, "Task")),
    contactFollowUps: contacts
      .filter((page) => {
        const value = plainProperty(page, "Next Follow-Up");
        return value && value <= nextWeek;
      })
      .map(
        (page) =>
          `${title(page, "Name")} — ${plainProperty(page, "Next Follow-Up")}`,
      ),
    decisions: logs
      .filter(
        (page) =>
          createdSince(page, since) &&
          Boolean(plainProperty(page, "Decisions Made")),
      )
      .map((page) => plainProperty(page, "Decisions Made")!),
    resources: resources
      .filter((page) => createdSince(page, since))
      .map((page) => title(page, "Title")),
    unresolvedQuestions: tasks
      .filter(
        (page) =>
          plainProperty(page, "Type") === "Question" &&
          !["Done", "Cancelled"].includes(status(page) ?? ""),
      )
      .map((page) => title(page, "Task")),
  };
}
