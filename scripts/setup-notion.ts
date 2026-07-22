import {
  Client,
  isFullDatabase,
  type CreateDatabaseParameters,
} from "@notionhq/client";
import { parseEnv } from "../src/config/env";
type Properties = NonNullable<
  NonNullable<CreateDatabaseParameters["initial_data_source"]>["properties"]
>;
const select = (options: string[]) => ({
  select: { options: options.map((name) => ({ name })) },
});
const multi = { multi_select: { options: [] } };
const rich = { rich_text: {} };
const date = { date: {} };
const people = { people: {} };
const files = { files: {} };
const source = select(["Telegram", "Manual", "Import", "Demo"]);
const env = parseEnv();
if (!env.NOTION_TOKEN || !env.NOTION_PARENT_PAGE_ID)
  throw new Error("NOTION_TOKEN and NOTION_PARENT_PAGE_ID are required");
const notion = new Client({ auth: env.NOTION_TOKEN });
const definitions: Array<{
  key: string;
  title: string;
  properties: Properties;
}> = [
  {
    key: "NOTION_CONTACTS_DATABASE_ID",
    title: "Contacts",
    properties: {
      Name: { title: {} },
      "Contact Type": select([
        "Person",
        "Lab",
        "Professor",
        "Researcher",
        "Company",
        "Organization",
        "Department",
        "Other",
      ]),
      "Contact Status": select([
        "Potential Contact",
        "Need to Contact",
        "Contacted",
        "Waiting for Response",
        "Active Collaborator",
        "Not Relevant",
        "Closed",
      ]),
      Organization: rich,
      Role: rich,
      Email: { email: {} },
      Phone: { phone_number: {} },
      Website: { url: {} },
      Expertise: multi,
      "Why Relevant": rich,
      "Could Help With": multi,
      Owner: people,
      "First Contact Date": date,
      "Last Contact Date": date,
      "Next Follow-Up": date,
      "What We Discussed": rich,
      Outcome: rich,
      "Next Step": rich,
      Notes: rich,
      Source: source,
      "Telegram Source ID": rich,
      "Created At": { created_time: {} },
      "Updated At": { last_edited_time: {} },
    },
  },
  {
    key: "NOTION_RESOURCES_DATABASE_ID",
    title: "Resources",
    properties: {
      Title: { title: {} },
      "Resource Type": select([
        "Research Paper",
        "Article",
        "GitHub Repository",
        "Dataset",
        "Tool",
        "Website",
        "Video",
        "Book",
        "Other",
      ]),
      URL: { url: {} },
      "Authors or Creator": rich,
      Publication: rich,
      "Publication Date": date,
      "Added By": people,
      "Date Added": { created_time: {} },
      "Short Description": rich,
      "Why It Matters": rich,
      "Key Findings": rich,
      "Relevant To": multi,
      Status: select(["Unread", "Reviewing", "Reviewed", "Useful", "Rejected"]),
      Citation: rich,
      Files: files,
      Source: source,
      "Telegram Source ID": rich,
    },
  },
  {
    key: "NOTION_TASKS_DATABASE_ID",
    title: "Tasks and Questions",
    properties: {
      Task: { title: {} },
      Type: select([
        "Task",
        "Question",
        "Research",
        "Contact",
        "Decision Needed",
      ]),
      Status: select([
        "Inbox",
        "Not Started",
        "In Progress",
        "Blocked",
        "Review",
        "Done",
        "Cancelled",
      ]),
      "Assigned To": people,
      Collaborators: people,
      Priority: select(["Critical", "High", "Medium", "Low"]),
      "Due Date": date,
      "Start Date": date,
      "Project Area": multi,
      Description: rich,
      "Definition of Done": rich,
      "Created By": people,
      Source: source,
      "Completed Date": date,
      Result: rich,
      "Telegram Source ID": rich,
      "Created At": { created_time: {} },
      "Updated At": { last_edited_time: {} },
    },
  },
  {
    key: "NOTION_PROJECT_LOG_DATABASE_ID",
    title: "Project Log",
    properties: {
      "Entry Title": { title: {} },
      Date: date,
      "Entry Type": select([
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
      Participants: people,
      Summary: rich,
      "Work Completed": rich,
      Outcome: rich,
      "What Worked": rich,
      "What Did Not Work": rich,
      "Open Questions": rich,
      "Decisions Made": rich,
      "Next Steps": rich,
      "Project Phase": select([
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
      ]),
      Attachments: files,
      "Submitted By": people,
      Source: source,
      "Original Transcript": rich,
      "Telegram Source ID": rich,
      "Created At": { created_time: {} },
      "Updated At": { last_edited_time: {} },
    },
  },
  {
    key: "NOTION_SYSTEM_STATE_DATABASE_ID",
    title: "System State (VeinzFlow internal)",
    properties: {
      Key: { title: {} },
      Value: rich,
      "Updated At": { last_edited_time: {} },
    },
  },
];
const search = await notion.search({
  query: "",
  filter: { property: "object", value: "data_source" },
  page_size: 100,
});
const found = new Map<string, string>();
for (const result of search.results) {
  if (
    result.object === "data_source" &&
    "name" in result &&
    typeof result.name === "string"
  )
    found.set(result.name, result.id);
}
const ids: Record<string, string> = {};
for (const definition of definitions) {
  const existing = found.get(definition.title);
  if (existing) {
    ids[definition.key] = existing;
    continue;
  }
  const database = await notion.databases.create({
    parent: { type: "page_id", page_id: env.NOTION_PARENT_PAGE_ID },
    title: [{ text: { content: definition.title } }],
    is_inline: true,
    initial_data_source: { properties: definition.properties },
  });
  if (!isFullDatabase(database) || !database.data_sources[0])
    throw new Error(`Could not create ${definition.title}`);
  ids[definition.key] = database.data_sources[0].id;
}
const relation = (dataSourceId: string) => ({
  relation: {
    data_source_id: dataSourceId,
    type: "single_property" as const,
    single_property: {},
  },
});
await notion.dataSources.update({
  data_source_id: ids.NOTION_CONTACTS_DATABASE_ID!,
  properties: {
    "Connected To": relation(ids.NOTION_CONTACTS_DATABASE_ID!),
    "Related Meetings": relation(ids.NOTION_PROJECT_LOG_DATABASE_ID!),
    "Related Tasks": relation(ids.NOTION_TASKS_DATABASE_ID!),
  },
});
await notion.dataSources.update({
  data_source_id: ids.NOTION_RESOURCES_DATABASE_ID!,
  properties: {
    "Related Tasks": relation(ids.NOTION_TASKS_DATABASE_ID!),
    "Related Log Entries": relation(ids.NOTION_PROJECT_LOG_DATABASE_ID!),
  },
});
await notion.dataSources.update({
  data_source_id: ids.NOTION_TASKS_DATABASE_ID!,
  properties: {
    "Blocked By": relation(ids.NOTION_TASKS_DATABASE_ID!),
    "Related Contact": relation(ids.NOTION_CONTACTS_DATABASE_ID!),
    "Related Resource": relation(ids.NOTION_RESOURCES_DATABASE_ID!),
    "Related Log Entry": relation(ids.NOTION_PROJECT_LOG_DATABASE_ID!),
  },
});
await notion.dataSources.update({
  data_source_id: ids.NOTION_PROJECT_LOG_DATABASE_ID!,
  properties: {
    "External Participants": relation(ids.NOTION_CONTACTS_DATABASE_ID!),
    "Related Tasks": relation(ids.NOTION_TASKS_DATABASE_ID!),
    "Related Resources": relation(ids.NOTION_RESOURCES_DATABASE_ID!),
  },
});
const children = await notion.blocks.children.list({
  block_id: env.NOTION_PARENT_PAGE_ID,
  page_size: 100,
});
const marker = "veinzflow-home-v1";
const initialized = children.results.some(
  (block) =>
    "paragraph" in block &&
    block.paragraph.rich_text.some((item) => item.plain_text.includes(marker)),
);
if (!initialized) {
  const paragraph = (content: string) => ({
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: [{ type: "text" as const, text: { content } }] },
  });
  const heading = (content: string) => ({
    object: "block" as const,
    type: "heading_2" as const,
    heading_2: { rich_text: [{ type: "text" as const, text: { content } }] },
  });
  await notion.blocks.children.append({
    block_id: env.NOTION_PARENT_PAGE_ID,
    children: [
      paragraph(marker),
      paragraph(
        "VeinzFlow is the operating system for this four-person vein research project. Capture updates in Telegram; validated records are routed into the databases below and summarized in a team digest every two calendar days.",
      ),
      heading("How to use this workspace"),
      paragraph(
        "Contacts stores people, labs, organizations, conversations, ownership, and follow-ups. Resources stores papers, datasets, repositories, tools, and links. Tasks and Questions stores assignments, deadlines, blockers, and open questions. Project Log is the dated research record. System State is internal operational data and must never contain secrets.",
      ),
      heading("Voice submission examples"),
      paragraph(
        "Try: “We met Dr. Patel today. Sara should send our equipment list by Friday.” Or: “Add this paper for review and create a task for Chu to summarize it next week.”",
      ),
      heading("Ownership and privacy"),
      paragraph(
        "Name a teammate only when assignment is explicit; unclear owners remain unassigned. Original transcripts and cleaned summaries are retained for traceability. Raw voice audio is not stored. API credentials stay in protected deployment settings, never in Notion.",
      ),
      heading("Team digest"),
      paragraph(
        "A daily scheduler checks whether two calendar days have elapsed since the last successful digest. It records the timestamp only after successful email delivery.",
      ),
    ],
  });
}
console.log(
  "Notion workspace is ready. Add these values to .env.local:\n" +
    Object.entries(ids)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n"),
);
