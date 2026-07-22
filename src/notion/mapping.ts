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
const optionalSelect = (value: string | null) => ({
  select: value ? { name: value } : null,
});
const multi = (values: string[]) => ({
  multi_select: values.map((name) => ({ name: name.slice(0, 100) })),
});
const date = (value: string | null) => ({
  date: value ? { start: value } : null,
});
const url = (value: string | null) => ({ url: value });
const people = (ids: string[]) => ({ people: ids.map((id) => ({ id })) });

export function mapContact(item: ContactUpdate): PageProperties {
  return {
    Name: title(item.name),
    "Contact Details": text(item.contactDetails),
    "Contact Status": optionalSelect(item.contactStatus),
    Expertise: multi(item.expertise),
    Notes: text(item.notes),
  };
}
export function mapResource(item: ResourceUpdate): PageProperties {
  return {
    Title: title(item.title),
    "Resource Type": select(item.resourceType),
    Link: url(item.link),
    Description: text(item.description),
    Notes: text(item.notes),
  };
}
export function mapTask(item: TaskUpdate, assigneeId?: string): PageProperties {
  return {
    Task: title(item.title),
    Status: select(item.status),
    "Assigned To": people(assigneeId ? [assigneeId] : []),
  };
}
export function mapProjectLog(item: ProjectLogEntryInput): PageProperties {
  return {
    Title: title(item.title),
    Date: date(item.date),
    Outcome: text(item.outcome),
    Questions: text(item.questions.join("\n")),
    "Next Steps": text(item.nextSteps.join("\n")),
  };
}
export function taskChildren(
  item: TaskUpdate,
): NonNullable<CreatePageParameters["children"]> {
  if (!item.notes) return [];
  return [
    {
      object: "block" as const,
      type: "paragraph" as const,
      paragraph: {
        rich_text: [
          {
            type: "text" as const,
            text: { content: item.notes.slice(0, 2000) },
          },
        ],
      },
    },
  ];
}
