import { describe, expect, it } from "vitest";
import {
  mapContact,
  mapProjectLog,
  mapResource,
  mapTask,
} from "@/notion/mapping";
import { projectUpdateSchema } from "@/schemas/project-update";
import { validProjectUpdate } from "../fixtures/project-update";
describe("Notion mapping", () => {
  it("maps validated domain objects deterministically", () => {
    const update = projectUpdateSchema.parse(validProjectUpdate);
    expect(mapContact(update.contacts[0]!).Name).toEqual({
      title: [{ text: { content: "Dr. Patel" } }],
    });
    expect(Object.keys(mapContact(update.contacts[0]!)).sort()).toEqual(
      [
        "Name",
        "Contact Details",
        "Contact Status",
        "Could Help With",
        "Expertise",
        "Notes",
      ].sort(),
    );
    expect(mapTask(update.tasks[0]!, "notion-user")["Assigned To"]).toEqual({
      people: [{ id: "notion-user" }],
    });
    expect(
      Object.keys(mapTask(update.tasks[0]!, "notion-user")).sort(),
    ).toEqual(["Task", "Assigned To", "Status"].sort());
    expect(Object.keys(mapProjectLog(update.logEntries[0]!)).sort()).toEqual(
      ["Title", "Outcome", "Date", "Next Steps", "Questions"].sort(),
    );
    expect(
      Object.keys(
        mapResource({
          title: "Paper",
          resourceType: "Paper",
          link: "https://example.com",
          description: "Description",
          notes: null,
          sourceMessageId: "42",
          confidence: 1,
        }),
      ).sort(),
    ).toEqual(
      ["Title", "Resource Type", "Link", "Description", "Notes"].sort(),
    );
  });
});
