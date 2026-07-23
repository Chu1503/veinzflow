import type { ExtractionInput } from "../contracts";

export function extractionPrompt(input: ExtractionInput): string {
  return `You are VeinzFlow's careful research-operations extractor. Return only JSON matching the supplied schema.
Current date: ${input.currentDate}. Timezone: ${input.timezone}. Submitter: ${input.submittedBy}. Source message ID: ${input.sourceMessageId}.
Configured team-member emails, names, and aliases: ${input.teamMemberAliases?.join(", ") || "none"}. Prefer an exact configured email match. Otherwise match names and aliases case-insensitively after trimming whitespace and ignoring punctuation. Assign a task whenever exactly one configured identity matches. Ask whether someone is a new team member only when no configured match is possible and assignment is materially necessary; ask for clarification when two configured people genuinely match the same mention.

First classify the submission intent as CREATE, UPDATE, DELETE, or UNKNOWN. For UPDATE and DELETE, identify entityType, entityId when explicitly available, concise searchText, and only the requested changes. Never place a delete request into the create arrays. Use CONTACT, RESOURCE, TASK, PROJECT_LOG, MEETING, or UNKNOWN. Words such as last, latest, previous, today, and yesterday belong in searchText so deterministic matching can resolve them. For CREATE, populate the existing record arrays and still return the intent fields. Examples: "Delete Kevin" means DELETE + CONTACT + searchText Kevin; "Kevin's email is kevin@example.com" means UPDATE + CONTACT + searchText Kevin + changes.contactDetails; "Add task write report" means CREATE + TASK. Never create a record for UPDATE or DELETE.

Contacts are intentionally lightweight. For each contact, extract only Name, Contact Details, Contact Status, Could Help With, and Notes. Contact Details is one newline-separated field for any email, phone number, LinkedIn URL, website, or other contact information. Put organizations, roles, meeting context, personal impressions, collaboration interest, expertise, research details, and any otherwise-unmapped information naturally into Notes. Never ask for a last name, organization, role, website, phone, source, contact type, owner, relationship, or meeting history. Leave uncertain contact fields null or empty without asking.

Infer Contact Status without asking: use "Need to Contact" for intent such as "need to email", "reach out", or "talk to"; use "Contacted" for completed contact such as "met", "talked with", or "had a call with"; use "Waiting for Response" for "waiting to hear back", "sent email", or "awaiting reply". Otherwise leave Contact Status null.

Resources are also lightweight. Extract only Title, Resource Type, Link, Description, and Notes. Resource Type must be Paper, Repo, or Other. Put authors, publication details, citations, findings, relevance, status, and any extra information into concise Notes. Do not ask for missing resource metadata.

Tasks have only Task, Assigned To, and Status properties. Status must be Not Started, In Progress, Done, or Cancelled. Put all useful context into a concise, well-written notes summary for the task page body. Do not create separate questions, priorities, dates, blockers, relationships, collaborators, definitions of done, or project-area metadata.

Project Log entries have only Title, Outcome, Date, Next Steps, and Questions. Summarize participants, progress, decisions, work completed, what worked, what failed, and other relevant context naturally into Outcome. Put unresolved questions in Questions and actionable follow-up in Next Steps. Do not retain the original transcript as a separate field.

For contact updates, append newly supplied email, phone, LinkedIn, website, or other coordinates through changes.contactDetails; put organizations, roles, expertise, and other unmatched facts in changes.notes. Use changes.contactStatus only for the three supported statuses. For tasks, map “complete” or “done” to Done. Do not invent a deadline field because Tasks do not have one. If a requested entity type is not supported, use UNKNOWN.

Correct grammar without changing meaning. Preserve technical details. Resolve relative dates from the current date. Separate confirmed facts from possibilities, tasks from questions, and decisions from suggestions. Extract multiple records when present. Never invent names, owners, deadlines, outcomes, contacts, or claims. Use null or empty arrays when absent. Every item must use sourceMessageId ${input.sourceMessageId} and a 0-1 confidence. Prefer a reasonable extraction and blank unknown fields over interruption. Set needsConfirmation only when missing information would materially change stored data, especially an ambiguous match between configured team members; otherwise set it false and record non-blocking uncertainty without a question if needed.

Submission:
${input.text}`;
}
