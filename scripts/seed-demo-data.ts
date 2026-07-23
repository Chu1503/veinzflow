import { loadEnvironment } from "./load-environment";

async function main(): Promise<void> {
  loadEnvironment();
  const [
    { Client },
    { parseEnv },
    { applyProjectUpdate },
    { projectUpdateSchema },
  ] = await Promise.all([
    import("@notionhq/client"),
    import("../src/config/env"),
    import("../src/services/apply-project-update"),
    import("../src/schemas/project-update"),
  ]);
  const env = parseEnv();
  if (!env.NOTION_TOKEN) throw new Error("NOTION_TOKEN is required");
  const sourceMessageId = `demo-${Date.now()}`;
  const update = projectUpdateSchema.parse({
    submissionSummary: "Demo meeting with Dr. Patel about ultrasound access.",
    contacts: [
      {
        name: "Dr. Maya Patel",
        contactDetails: null,
        contactStatus: "Contacted",
        expertise: ["Ultrasound"],
        couldHelpWith: ["Equipment access"],
        notes:
          "Ultrasound researcher at Demo University. Discussed possible equipment access and requested an equipment list. Demo record.",
        sourceMessageId,
        confidence: 1,
      },
    ],
    resources: [],
    tasks: [
      {
        title: "Send equipment list to Dr. Patel",
        status: "Not Started",
        assignedToName: null,
        notes: "Send the project equipment list requested by Dr. Maya Patel.",
        sourceMessageId,
        confidence: 1,
      },
    ],
    logEntries: [
      {
        title: "Conversation with Dr. Patel",
        date: new Date().toISOString().slice(0, 10),
        outcome:
          "Discussed possible ultrasound equipment access. Dr. Patel requested an equipment list.",
        questions: [],
        nextSteps: ["Send equipment list"],
        sourceMessageId,
        confidence: 1,
      },
    ],
    uncertainties: [],
    confidence: 1,
    needsConfirmation: false,
  });
  const results = await applyProjectUpdate(
    new Client({ auth: env.NOTION_TOKEN }),
    env,
    update,
  );
  console.log(
    `Created demo data: ${results.map((item) => `${item.kind}:${item.action}`).join(", ")}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
