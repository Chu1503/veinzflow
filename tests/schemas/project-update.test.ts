import { describe, expect, it } from "vitest";
import { projectUpdateSchema } from "@/schemas/project-update";
import { validProjectUpdate } from "../fixtures/project-update";
describe("project update schema", () => {
  it("accepts a meeting with a contact, task, and log", () => {
    const result = projectUpdateSchema.parse(validProjectUpdate);
    expect(result.tasks[0]?.assignedToName).toBe("Sara");
  });
  it("rejects invalid confidence", () => {
    expect(() =>
      projectUpdateSchema.parse({ ...validProjectUpdate, confidence: 2 }),
    ).toThrow();
  });
  it("allows blank contact details and only the streamlined statuses", () => {
    const result = projectUpdateSchema.parse({
      ...validProjectUpdate,
      contacts: [
        {
          ...validProjectUpdate.contacts[0],
          contactDetails: null,
          contactStatus: null,
        },
      ],
    });
    expect(result.contacts[0]?.contactStatus).toBeNull();
    expect(() =>
      projectUpdateSchema.parse({
        ...validProjectUpdate,
        contacts: [
          {
            ...validProjectUpdate.contacts[0],
            contactStatus: "Active Collaborator",
          },
        ],
      }),
    ).toThrow();
  });
});
