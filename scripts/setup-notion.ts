import type {
  CreateDatabaseParameters,
  PageObjectResponse,
} from "@notionhq/client";
import { loadEnvironment } from "./load-environment";
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
type PageProperty = PageObjectResponse["properties"][string];
const propertyText = (property: PageProperty | undefined): string | null => {
  if (!property) return null;
  if (property.type === "rich_text")
    return property.rich_text.map((item) => item.plain_text).join("") || null;
  if (property.type === "email") return property.email;
  if (property.type === "phone_number") return property.phone_number;
  if (property.type === "url") return property.url;
  if (property.type === "select") return property.select?.name ?? null;
  if (property.type === "multi_select")
    return property.multi_select.map((item) => item.name).join(", ") || null;
  if (property.type === "date") return property.date?.start ?? null;
  if (property.type === "people")
    return (
      property.people
        .map((person) => ("name" in person ? person.name : null))
        .filter(Boolean)
        .join(", ") || null
    );
  return null;
};
const richTextContent = (value: string) =>
  value.match(/[\s\S]{1,1900}/g)?.map((content) => ({ text: { content } })) ??
  [];

async function main(): Promise<void> {
  loadEnvironment();
  const [
    { Client, isFullDatabase, isFullDataSource, isFullPage },
    { parseEnv },
  ] = await Promise.all([
    import("@notionhq/client"),
    import("../src/config/env"),
  ]);
  const env = parseEnv();
  if (!env.NOTION_TOKEN || !env.NOTION_PARENT_PAGE_ID)
    throw new Error("NOTION_TOKEN and NOTION_PARENT_PAGE_ID are required");
  const notion = new Client({ auth: env.NOTION_TOKEN });
  const definitions: Array<{
    key: string;
    title: string;
    legacyTitle?: string;
    properties: Properties;
  }> = [
    {
      key: "NOTION_CONTACTS_DATABASE_ID",
      title: "Contacts",
      properties: {
        Name: { title: {} },
        "Contact Details": rich,
        "Contact Status": select([
          "Need to Contact",
          "Contacted",
          "Waiting for Response",
        ]),
        Expertise: multi,
        Notes: rich,
      },
    },
    {
      key: "NOTION_RESOURCES_DATABASE_ID",
      title: "Resources",
      properties: {
        Title: { title: {} },
        "Resource Type": select(["Paper", "Repo", "Other"]),
        Link: { url: {} },
        Description: rich,
        Notes: rich,
      },
    },
    {
      key: "NOTION_TASKS_DATABASE_ID",
      title: "Tasks",
      legacyTitle: "Tasks and Questions",
      properties: {
        Task: { title: {} },
        Status: select(["Not Started", "In Progress", "Done", "Cancelled"]),
        "Assigned To": people,
      },
    },
    {
      key: "NOTION_PROJECT_LOG_DATABASE_ID",
      title: "Project Log",
      properties: {
        Title: { title: {} },
        Date: date,
        Outcome: rich,
        Questions: rich,
        "Next Steps": rich,
      },
    },
  ];
  const found = new Map<string, string>();
  const activeDataSourceIds = new Set<string>();
  let searchCursor: string | undefined;
  do {
    const search = await notion.search({
      query: "",
      filter: { property: "object", value: "data_source" },
      page_size: 100,
      ...(searchCursor ? { start_cursor: searchCursor } : {}),
    });
    for (const result of search.results)
      if (isFullDataSource(result)) {
        const title = result.title.map((item) => item.plain_text).join("");
        activeDataSourceIds.add(result.id);
        if (!found.has(title)) found.set(title, result.id);
      }
    searchCursor = search.has_more
      ? (search.next_cursor ?? undefined)
      : undefined;
  } while (searchCursor);
  const ids: Record<string, string> = {};
  for (const definition of definitions) {
    const configuredId = process.env[definition.key];
    const existing =
      configuredId && activeDataSourceIds.has(configuredId)
        ? configuredId
        : (found.get(definition.title) ??
          (definition.legacyTitle
            ? found.get(definition.legacyTitle)
            : undefined));
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

  const contactsId = ids.NOTION_CONTACTS_DATABASE_ID!;
  await notion.dataSources.update({
    data_source_id: contactsId,
    properties: {
      "Contact Details": rich,
      "Contact Status": select([
        "Need to Contact",
        "Contacted",
        "Waiting for Response",
      ]),
      Expertise: multi,
      Notes: rich,
    },
  });

  let contactCursor: string | undefined;
  do {
    const pages = await notion.dataSources.query({
      data_source_id: contactsId,
      page_size: 100,
      ...(contactCursor ? { start_cursor: contactCursor } : {}),
    });
    for (const page of pages.results.filter(isFullPage)) {
      const currentDetails = propertyText(page.properties["Contact Details"]);
      const contactDetails = [
        currentDetails,
        propertyText(page.properties.Email),
        propertyText(page.properties.Phone),
        propertyText(page.properties.Website),
      ].filter((value, index, values): value is string =>
        Boolean(value && values.indexOf(value) === index),
      );
      const currentNotes = propertyText(page.properties.Notes);
      const legacyNotes = [
        ["Organization", propertyText(page.properties.Organization)],
        ["Role", propertyText(page.properties.Role)],
        ["Could help with", propertyText(page.properties["Could Help With"])],
        ["Why relevant", propertyText(page.properties["Why Relevant"])],
        [
          "What we discussed",
          propertyText(page.properties["What We Discussed"]),
        ],
        ["Outcome", propertyText(page.properties.Outcome)],
        ["Next step", propertyText(page.properties["Next Step"])],
      ]
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([label, value]) => `${label}: ${value}`);
      const notes = [currentNotes, ...legacyNotes].filter(Boolean).join("\n");
      if (
        contactDetails.join("\n") !== (currentDetails ?? "") ||
        notes !== (currentNotes ?? "")
      )
        await notion.pages.update({
          page_id: page.id,
          properties: {
            "Contact Details": {
              rich_text: richTextContent(contactDetails.join("\n")),
            },
            Notes: {
              rich_text: richTextContent(notes),
            },
          },
        });
    }
    contactCursor = pages.has_more
      ? (pages.next_cursor ?? undefined)
      : undefined;
  } while (contactCursor);

  const allowedContactProperties = new Set([
    "Name",
    "Contact Details",
    "Contact Status",
    "Expertise",
    "Notes",
  ]);
  const contactsSchema = await notion.dataSources.retrieve({
    data_source_id: contactsId,
  });
  if (!isFullDataSource(contactsSchema))
    throw new Error("Could not retrieve the Contacts schema for migration");
  const removedContactProperties = Object.keys(
    contactsSchema.properties,
  ).filter((property) => !allowedContactProperties.has(property));
  await notion.dataSources.update({
    data_source_id: contactsId,
    properties: Object.fromEntries(
      removedContactProperties.map((property) => [property, null]),
    ),
  });

  const removeOtherProperties = async (
    dataSourceId: string,
    allowed: Set<string>,
    label: string,
  ) => {
    const schema = await notion.dataSources.retrieve({
      data_source_id: dataSourceId,
    });
    if (!isFullDataSource(schema))
      throw new Error(`Could not retrieve the ${label} schema for migration`);
    const removed = Object.keys(schema.properties).filter(
      (property) => !allowed.has(property),
    );
    if (removed.length)
      await notion.dataSources.update({
        data_source_id: dataSourceId,
        properties: Object.fromEntries(
          removed.map((property) => [property, null]),
        ),
      });
  };

  const resourcesId = ids.NOTION_RESOURCES_DATABASE_ID!;
  const resourcesSchema = await notion.dataSources.retrieve({
    data_source_id: resourcesId,
  });
  if (!isFullDataSource(resourcesSchema))
    throw new Error("Could not retrieve the Resources schema for migration");
  await notion.dataSources.update({
    data_source_id: resourcesId,
    properties: {
      ...(resourcesSchema.properties.URL && !resourcesSchema.properties.Link
        ? { URL: { name: "Link" } }
        : { Link: { url: {} } }),
      ...(resourcesSchema.properties["Short Description"] &&
      !resourcesSchema.properties.Description
        ? { "Short Description": { name: "Description" } }
        : { Description: rich }),
      Notes: rich,
    },
  });
  let resourceCursor: string | undefined;
  do {
    const pages = await notion.dataSources.query({
      data_source_id: resourcesId,
      page_size: 100,
      ...(resourceCursor ? { start_cursor: resourceCursor } : {}),
    });
    for (const page of pages.results.filter(isFullPage)) {
      const oldType = propertyText(page.properties["Resource Type"]);
      const resourceType =
        oldType === "Research Paper" || oldType === "Paper"
          ? "Paper"
          : oldType === "GitHub Repository" || oldType === "Repo"
            ? "Repo"
            : "Other";
      const currentNotes = propertyText(page.properties.Notes);
      const legacyNotes = [
        [
          "Authors or creator",
          propertyText(page.properties["Authors or Creator"]),
        ],
        ["Citation", propertyText(page.properties.Citation)],
        ["Key findings", propertyText(page.properties["Key Findings"])],
        ["Publication", propertyText(page.properties.Publication)],
        ["Publication date", propertyText(page.properties["Publication Date"])],
        ["Relevant to", propertyText(page.properties["Relevant To"])],
        ["Why it matters", propertyText(page.properties["Why It Matters"])],
      ]
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([label, value]) => `${label}: ${value}`);
      await notion.pages.update({
        page_id: page.id,
        properties: {
          "Resource Type": { select: { name: resourceType } },
          Notes: {
            rich_text: richTextContent(
              [currentNotes, ...legacyNotes].filter(Boolean).join("\n"),
            ),
          },
        },
      });
    }
    resourceCursor = pages.has_more
      ? (pages.next_cursor ?? undefined)
      : undefined;
  } while (resourceCursor);
  await notion.dataSources.update({
    data_source_id: resourcesId,
    properties: {
      "Resource Type": select(["Paper", "Repo", "Other"]),
    },
  });
  await removeOtherProperties(
    resourcesId,
    new Set(["Title", "Resource Type", "Link", "Description", "Notes"]),
    "Resources",
  );

  const tasksId = ids.NOTION_TASKS_DATABASE_ID!;
  const tasksSchema = await notion.dataSources.retrieve({
    data_source_id: tasksId,
  });
  if (!isFullDataSource(tasksSchema))
    throw new Error("Could not retrieve the Tasks schema for migration");
  await notion.dataSources.update({
    data_source_id: tasksId,
    title: [{ text: { content: "Tasks" } }],
  });
  if (tasksSchema.parent.type === "database_id")
    await notion.databases.update({
      database_id: tasksSchema.parent.database_id,
      title: [{ text: { content: "Tasks" } }],
    });
  let taskCursor: string | undefined;
  do {
    const pages = await notion.dataSources.query({
      data_source_id: tasksId,
      page_size: 100,
      ...(taskCursor ? { start_cursor: taskCursor } : {}),
    });
    for (const page of pages.results.filter(isFullPage)) {
      const oldStatus = propertyText(page.properties.Status);
      const status =
        oldStatus === "Done"
          ? "Done"
          : oldStatus === "Cancelled"
            ? "Cancelled"
            : ["In Progress", "Blocked", "Review"].includes(oldStatus ?? "")
              ? "In Progress"
              : "Not Started";
      const legacyDetails = [
        ["Type", propertyText(page.properties.Type)],
        ["Description", propertyText(page.properties.Description)],
        [
          "Definition of done",
          propertyText(page.properties["Definition of Done"]),
        ],
        ["Due date", propertyText(page.properties["Due Date"])],
        ["Priority", propertyText(page.properties.Priority)],
        ["Project area", propertyText(page.properties["Project Area"])],
        ["Result", propertyText(page.properties.Result)],
        ["Start date", propertyText(page.properties["Start Date"])],
      ]
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([label, value]) => `${label}: ${value}`);
      await notion.pages.update({
        page_id: page.id,
        properties: { Status: { select: { name: status } } },
      });
      if (legacyDetails.length)
        await notion.blocks.children.append({
          block_id: page.id,
          children: [
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: richTextContent(legacyDetails.join("\n")),
              },
            },
          ],
        });
    }
    taskCursor = pages.has_more ? (pages.next_cursor ?? undefined) : undefined;
  } while (taskCursor);
  await notion.dataSources.update({
    data_source_id: tasksId,
    properties: {
      Status: select(["Not Started", "In Progress", "Done", "Cancelled"]),
      "Assigned To": people,
    },
  });
  await removeOtherProperties(
    tasksId,
    new Set(["Task", "Assigned To", "Status"]),
    "Tasks",
  );

  const projectLogId = ids.NOTION_PROJECT_LOG_DATABASE_ID!;
  const projectLogSchema = await notion.dataSources.retrieve({
    data_source_id: projectLogId,
  });
  if (!isFullDataSource(projectLogSchema))
    throw new Error("Could not retrieve the Project Log schema for migration");
  await notion.dataSources.update({
    data_source_id: projectLogId,
    properties: {
      ...(projectLogSchema.properties["Entry Title"] &&
      !projectLogSchema.properties.Title
        ? { "Entry Title": { name: "Title" } }
        : {}),
      ...(projectLogSchema.properties["Open Questions"] &&
      !projectLogSchema.properties.Questions
        ? { "Open Questions": { name: "Questions" } }
        : { Questions: rich }),
      Outcome: rich,
      "Next Steps": rich,
      Date: date,
    },
  });
  let logCursor: string | undefined;
  do {
    const pages = await notion.dataSources.query({
      data_source_id: projectLogId,
      page_size: 100,
      ...(logCursor ? { start_cursor: logCursor } : {}),
    });
    for (const page of pages.results.filter(isFullPage)) {
      const currentOutcome = propertyText(page.properties.Outcome);
      const legacyOutcome = [
        ["Participants", propertyText(page.properties.Participants)],
        ["Summary", propertyText(page.properties.Summary)],
        ["Work completed", propertyText(page.properties["Work Completed"])],
        ["Decisions", propertyText(page.properties["Decisions Made"])],
        ["What worked", propertyText(page.properties["What Worked"])],
        [
          "What did not work",
          propertyText(page.properties["What Did Not Work"]),
        ],
      ]
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([label, value]) => `${label}: ${value}`);
      const outcome = [currentOutcome, ...legacyOutcome]
        .filter(Boolean)
        .join("\n");
      if (outcome !== (currentOutcome ?? ""))
        await notion.pages.update({
          page_id: page.id,
          properties: {
            Outcome: { rich_text: richTextContent(outcome) },
          },
        });
    }
    logCursor = pages.has_more ? (pages.next_cursor ?? undefined) : undefined;
  } while (logCursor);
  await removeOtherProperties(
    projectLogId,
    new Set(["Title", "Outcome", "Date", "Next Steps", "Questions"]),
    "Project Log",
  );

  const obsoleteSystemState =
    found.get("System State (VeinzFlow internal)") ??
    process.env.NOTION_SYSTEM_STATE_DATABASE_ID;
  if (obsoleteSystemState) {
    try {
      const obsoleteSchema = await notion.dataSources.retrieve({
        data_source_id: obsoleteSystemState,
      });
      if (isFullDataSource(obsoleteSchema) && obsoleteSchema.in_trash) {
        // The migration already removed it.
      } else if (
        isFullDataSource(obsoleteSchema) &&
        obsoleteSchema.parent.type === "database_id"
      )
        await notion.databases.update({
          database_id: obsoleteSchema.parent.database_id,
          in_trash: true,
        });
      else
        await notion.dataSources.update({
          data_source_id: obsoleteSystemState,
          in_trash: true,
        });
    } catch {
      console.warn(
        "The obsolete internal state data source was already unavailable; continuing.",
      );
    }
  }
  const generatedHeadings = new Set([
    "How to use this workspace",
    "Voice submission examples",
    "Ownership and privacy",
    "Team digest",
  ]);
  const generatedParagraphPrefixes = [
    "veinzflow-home-v1",
    "VeinzFlow is the operating system for this four-person",
    "Contacts stores people, labs, organizations",
    "Contacts stores only essential research relationships",
    "Try: “We met Dr. Patel today.",
    "Name a teammate only when assignment is explicit",
    "A daily scheduler checks whether two calendar days",
    "A daily scheduler sends the digest on deterministic alternate calendar days",
  ];
  let blockCursor: string | undefined;
  do {
    const children = await notion.blocks.children.list({
      block_id: env.NOTION_PARENT_PAGE_ID,
      page_size: 100,
      ...(blockCursor ? { start_cursor: blockCursor } : {}),
    });
    for (const block of children.results) {
      const text =
        "paragraph" in block
          ? block.paragraph.rich_text.map((item) => item.plain_text).join("")
          : "heading_2" in block
            ? block.heading_2.rich_text.map((item) => item.plain_text).join("")
            : "";
      if (
        generatedHeadings.has(text) ||
        generatedParagraphPrefixes.some((prefix) => text.startsWith(prefix))
      )
        await notion.blocks.delete({ block_id: block.id });
    }
    blockCursor = children.has_more
      ? (children.next_cursor ?? undefined)
      : undefined;
  } while (blockCursor);
  console.log(
    "Notion workspace is ready. Add these values to .env.local:\n" +
      Object.entries(ids)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n"),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
