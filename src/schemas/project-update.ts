import { z } from "zod";

const optionalText = z.string().trim().min(1).nullable().default(null);
const sourceFields = {
  sourceMessageId: z.string().min(1),
  confidence: z.number().min(0).max(1),
};

export const contactUpdateSchema = z.object({
  name: z.string().min(1),
  contactType: z
    .enum([
      "Person",
      "Lab",
      "Professor",
      "Researcher",
      "Company",
      "Organization",
      "Department",
      "Other",
    ])
    .default("Other"),
  contactStatus: z
    .enum([
      "Potential Contact",
      "Need to Contact",
      "Contacted",
      "Waiting for Response",
      "Active Collaborator",
      "Not Relevant",
      "Closed",
    ])
    .default("Potential Contact"),
  organization: optionalText,
  role: optionalText,
  email: z.string().email().nullable().default(null),
  phone: optionalText,
  website: z.string().url().nullable().default(null),
  expertise: z.array(z.string()).default([]),
  whyRelevant: optionalText,
  couldHelpWith: z.array(z.string()).default([]),
  ownerName: optionalText,
  firstContactDate: optionalText,
  lastContactDate: optionalText,
  nextFollowUp: optionalText,
  discussion: optionalText,
  outcome: optionalText,
  nextStep: optionalText,
  notes: optionalText,
  ...sourceFields,
});

export const resourceUpdateSchema = z.object({
  title: z.string().min(1),
  resourceType: z
    .enum([
      "Research Paper",
      "Article",
      "GitHub Repository",
      "Dataset",
      "Tool",
      "Website",
      "Video",
      "Book",
      "Other",
    ])
    .default("Other"),
  url: z.string().url().nullable().default(null),
  authorsOrCreator: optionalText,
  publication: optionalText,
  publicationDate: optionalText,
  shortDescription: optionalText,
  whyItMatters: optionalText,
  keyFindings: optionalText,
  relevantTo: z.array(z.string()).default([]),
  status: z
    .enum(["Unread", "Reviewing", "Reviewed", "Useful", "Rejected"])
    .default("Unread"),
  citation: optionalText,
  ...sourceFields,
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1),
  type: z
    .enum(["Task", "Question", "Research", "Contact", "Decision Needed"])
    .default("Task"),
  status: z
    .enum([
      "Inbox",
      "Not Started",
      "In Progress",
      "Blocked",
      "Review",
      "Done",
      "Cancelled",
    ])
    .default("Inbox"),
  assignedToName: optionalText,
  collaboratorNames: z.array(z.string()).default([]),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).default("Medium"),
  dueDate: optionalText,
  startDate: optionalText,
  projectArea: z.array(z.string()).default([]),
  description: optionalText,
  definitionOfDone: optionalText,
  relatedContactName: optionalText,
  relatedResourceUrl: optionalText,
  result: optionalText,
  ...sourceFields,
});

export const projectLogEntrySchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  entryType: z.enum([
    "Progress Update",
    "Meeting",
    "Experiment",
    "Decision",
    "Completed Work",
    "Problem",
    "Observation",
    "Milestone",
    "External Conversation",
  ]),
  participantNames: z.array(z.string()).default([]),
  externalParticipantNames: z.array(z.string()).default([]),
  summary: z.string().min(1),
  workCompleted: optionalText,
  outcome: optionalText,
  whatWorked: optionalText,
  whatDidNotWork: optionalText,
  openQuestions: z.array(z.string()).default([]),
  decisionsMade: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
  projectPhase: z
    .enum([
      "Planning",
      "Literature Review",
      "Outreach",
      "Research",
      "Design",
      "Building",
      "Testing",
      "Analysis",
      "Writing",
      "Complete",
    ])
    .default("Research"),
  originalTranscript: z.string().min(1),
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
