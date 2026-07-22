import { describe, expect, it } from "vitest";
import { mapContact, mapTask } from "@/notion/mapping";
import { projectUpdateSchema } from "@/schemas/project-update";
import { validProjectUpdate } from "../fixtures/project-update";
describe("Notion mapping", () => {
  it("maps validated domain objects deterministically", () => {
    const update = projectUpdateSchema.parse(validProjectUpdate);
    expect(mapContact(update.contacts[0]!).Name).toEqual({
      title: [{ text: { content: "Dr. Patel" } }],
    });
    expect(mapTask(update.tasks[0]!, "notion-user")["Assigned To"]).toEqual({
      people: [{ id: "notion-user" }],
    });
  });
});
