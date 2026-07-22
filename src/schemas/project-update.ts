import { z } from "zod";

const optionalText = z.string().trim().min(1).nullable().default(null);
const sourceFields = {
  sourceMessageId: z.string().min(1),
  confidence: z.number().min(0).max(1),
};

export const contactUpdateSchema = z.object({
  name: z.string().min(1),
  contactDetails: optionalText.describe(
    "Newline-separated email, phone, LinkedIn, website, or other contact information; null when unknown",
  ),
  contactStatus: z
    .enum(["Need to Contact", "Contacted", "Waiting for Response"])
    .nullable()
    .default(null)
    .describe(
      "Infer from intent/contact history; use null when no status is stated",
    ),
  expertise: z.array(z.string()).default([]),
  notes: optionalText.describe(
    "Catch-all for organization, role, meeting context, impressions, collaboration interest, and other useful contact facts",
  ),
  ...sourceFields,
});

export const resourceUpdateSchema = z.object({
  title: z.string().min(1),
  resourceType: z.enum(["Paper", "Repo", "Other"]).default("Other"),
  link: z.string().url().nullable().default(null),
  description: optionalText,
  notes: optionalText.describe(
    "Catch-all for authors, publication context, findings, relevance, citation details, and other useful resource information",
  ),
  ...sourceFields,
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1),
  status: z
    .enum(["Not Started", "In Progress", "Done", "Cancelled"])
    .default("Not Started"),
  assignedToName: optionalText,
  notes: optionalText.describe(
    "A concise, well-written summary of useful task context that will be stored in the task page body",
  ),
  ...sourceFields,
});

export const projectLogEntrySchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  outcome: optionalText,
  questions: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
  ...sourceFields,
});

export const uncertaintySchema = z.object({
  field: z.string().min(1),
  itemType: z.string().min(1),
  explanation: z.string().min(1),
  clarificationQuestion: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
});

export const projectUpdateSchema = z.object({
  submissionSummary: z.string().min(1),
  contacts: z.array(contactUpdateSchema).default([]),
  resources: z.array(resourceUpdateSchema).default([]),
  tasks: z.array(taskUpdateSchema).default([]),
  logEntries: z.array(projectLogEntrySchema).default([]),
  uncertainties: z.array(uncertaintySchema).default([]),
  confidence: z.number().min(0).max(1),
  needsConfirmation: z.boolean(),
});

export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;
export type ContactUpdate = z.infer<typeof contactUpdateSchema>;
export type ResourceUpdate = z.infer<typeof resourceUpdateSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;
export type ProjectLogEntryInput = z.infer<typeof projectLogEntrySchema>;
