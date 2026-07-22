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
});
