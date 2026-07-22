import { z } from "zod";

export const digestDataSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  logEntries: z.array(z.string()),
  completedTasks: z.array(z.string()),
  activeTasks: z.array(z.string()),
  resources: z.array(z.string()),
  questions: z.array(z.string()),
});
export const projectDigestSchema = z.object({
  subject: z.string().min(1),
  text: z.string().min(1),
  html: z.string().min(1),
});
export type DigestInput = z.infer<typeof digestDataSchema>;
export type ProjectDigest = z.infer<typeof projectDigestSchema>;
