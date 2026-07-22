import type { CreatePageParameters } from "@notionhq/client";
import type {
  ContactUpdate,
  ProjectLogEntryInput,
  ResourceUpdate,
  TaskUpdate,
} from "@/schemas/project-update";

export type PageProperties = NonNullable<CreatePageParameters["properties"]>;
const text = (value: string | null) => ({
  rich_text: value ? [{ text: { content: value.slice(0, 2000) } }] : [],
});
const title = (value: string) => ({
  title: [{ text: { content: value.slice(0, 2000) } }],
});
const select = (value: string) => ({ select: { name: value } });
const multi = (values: string[]) => ({
  multi_select: values.map((name) => ({ name: name.slice(0, 100) })),
});
const date = (value: string | null) => ({
  date: value ? { start: value } : null,
});
const email = (value: string | null) => ({ email: value });
const url = (value: string | null) => ({ url: value });
const people = (ids: string[]) => ({ people: ids.map((id) => ({ id })) });

export function mapContact(
  item: ContactUpdate,
  ownerId?: string,
): PageProperties {
  return {
    Name: title(item.name),
    "Contact Type": select(item.contactType),
    "Contact Status": select(item.contactStatus),
    Organization: text(item.organization),
    Role: text(item.role),
    Email: email(item.email),
    Phone: { phone_number: item.phone },
    Website: url(item.website),
    Expertise: multi(item.expertise),
    "Why Relevant": text(item.whyRelevant),
    "Could Help With": multi(item.couldHelpWith),
    Owner: people(ownerId ? [ownerId] : []),
    "First Contact Date": date(item.firstContactDate),
    "Last Contact Date": date(item.lastContactDate),
    "Next Follow-Up": date(item.nextFollowUp),
    "What We Discussed": text(item.discussion),
    Outcome: text(item.outcome),
    "Next Step": text(item.nextStep),
    Notes: text(item.notes),
    Source: select("Telegram"),
    "Telegram Source ID": text(item.sourceMessageId),
  };
}
export function mapResource(item: ResourceUpdate): PageProperties {
  return {
    Title: title(item.title),
    "Resource Type": select(item.resourceType),
    URL: url(item.url),
    "Authors or Creator": text(item.authorsOrCreator),
    Publication: text(item.publication),
    "Publication Date": date(item.publicationDate),
    "Short Description": text(item.shortDescription),
    "Why It Matters": text(item.whyItMatters),
    "Key Findings": text(item.keyFindings),
    "Relevant To": multi(item.relevantTo),
    Status: select(item.status),
    Citation: text(item.citation),
    Source: select("Telegram"),
    "Telegram Source ID": text(item.sourceMessageId),
  };
}
export function mapTask(
  item: TaskUpdate,
  assigneeId?: string,
  collaboratorIds: string[] = [],
): PageProperties {
  return {
    Task: title(item.title),
    Type: select(item.type),
    Status: select(item.status),
    "Assigned To": people(assigneeId ? [assigneeId] : []),
    Collaborators: people(collaboratorIds),
    Priority: select(item.priority),
    "Due Date": date(item.dueDate),
    "Start Date": date(item.startDate),
    "Project Area": multi(item.projectArea),
    Description: text(item.description),
    "Definition of Done": text(item.definitionOfDone),
    Result: text(item.result),
    Source: select("Telegram"),
    "Telegram Source ID": text(item.sourceMessageId),
    "Completed Date": date(
      item.status === "Done" ? new Date().toISOString().slice(0, 10) : null,
    ),
  };
}
export function mapProjectLog(
  item: ProjectLogEntryInput,
  participantIds: string[] = [],
): PageProperties {
  return {
    "Entry Title": title(item.title),
    Date: date(item.date),
    "Entry Type": select(item.entryType),
    Participants: people(participantIds),
    Summary: text(item.summary),
    "Work Completed": text(item.workCompleted),
    Outcome: text(item.outcome),
    "What Worked": text(item.whatWorked),
    "What Did Not Work": text(item.whatDidNotWork),
    "Open Questions": text(item.openQuestions.join("\n")),
    "Decisions Made": text(item.decisionsMade.join("\n")),
    "Next Steps": text(item.nextSteps.join("\n")),
    "Project Phase": select(item.projectPhase),
    Source: select("Telegram"),
    "Original Transcript": text(item.originalTranscript),
    "Telegram Source ID": text(item.sourceMessageId),
  };
}
export function projectLogChildren(
  item: ProjectLogEntryInput,
): NonNullable<CreatePageParameters["children"]> {
  const section = (heading: string, content: string | null) => [
    {
      object: "block" as const,
      type: "heading_2" as const,
      heading_2: {
        rich_text: [{ type: "text" as const, text: { content: heading } }],
      },
    },
    {
      object: "block" as const,
      type: "paragraph" as const,
      paragraph: {
        rich_text: content
          ? [
              {
                type: "text" as const,
                text: { content: content.slice(0, 2000) },
              },
            ]
          : [],
      },
    },
  ];
  return [
    ...section("Summary", item.summary),
    ...section("What Happened", item.workCompleted),
    ...section("Outcome", item.outcome),
    ...section("What Worked", item.whatWorked),
    ...section("What Did Not Work", item.whatDidNotWork),
    ...section("Decisions", item.decisionsMade.join("\n") || null),
    ...section("Open Questions", item.openQuestions.join("\n") || null),
    ...section("Next Steps", item.nextSteps.join("\n") || null),
    ...section("Related Evidence and Files", null),
    ...section("Original Transcript", item.originalTranscript),
  ];
}
