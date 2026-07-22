import type { Client } from "@notionhq/client";
import type { AppEnv } from "@/config/env";
import type { ProjectUpdate } from "@/schemas/project-update";
import {
  createProjectLog,
  createTask,
  upsertContact,
  upsertResource,
  type WriteResult,
} from "@/notion/records";
export async function applyProjectUpdate(
  client: Client,
  env: AppEnv,
  update: ProjectUpdate,
): Promise<WriteResult[]> {
  const results: WriteResult[] = [];
  for (const item of update.contacts)
    results.push(await upsertContact(client, env, item));
  for (const item of update.resources)
    results.push(await upsertResource(client, env, item));
  for (const [index, item] of update.tasks.entries())
    results.push(
      await createTask(client, env, {
        ...item,
        sourceMessageId: `${item.sourceMessageId}:task:${index}`,
      }),
    );
  for (const [index, item] of update.logEntries.entries())
    results.push(
      await createProjectLog(client, env, {
        ...item,
        sourceMessageId: `${item.sourceMessageId}:log:${index}`,
      }),
    );
  return results;
}
