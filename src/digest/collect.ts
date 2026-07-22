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
  const [logs, tasks, resources] = await Promise.all([
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
      required(
        env.NOTION_RESOURCES_DATABASE_ID,
        "NOTION_RESOURCES_DATABASE_ID",
      ),
    ),
  ]);
  const status = (page: PageObjectResponse) => plainProperty(page, "Status");
  return {
    periodStart: since.toISOString(),
    periodEnd: now.toISOString(),
    logEntries: logs
      .filter((page) => createdSince(page, since))
      .map((page) => title(page, "Title")),
    completedTasks: tasks
      .filter((page) => status(page) === "Done" && createdSince(page, since))
      .map((page) => title(page, "Task")),
    activeTasks: tasks
      .filter((page) =>
        ["Not Started", "In Progress"].includes(status(page) ?? ""),
      )
      .map((page) => title(page, "Task")),
    resources: resources
      .filter((page) => createdSince(page, since))
      .map((page) => title(page, "Title")),
    questions: logs
      .filter((page) => createdSince(page, since))
      .flatMap((page) =>
        (plainProperty(page, "Questions") ?? "")
          .split("\n")
          .map((question) => question.trim())
          .filter(Boolean),
      ),
  };
}
