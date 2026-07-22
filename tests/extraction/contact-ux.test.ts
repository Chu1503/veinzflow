import { describe, expect, it } from "vitest";
import { extractionPrompt } from "@/ai/prompts/extract-project-update";
import { clarificationMessage } from "@/services/clarify";
import { projectUpdateSchema } from "@/schemas/project-update";
import { validProjectUpdate } from "../fixtures/project-update";

describe("contact extraction UX", () => {
  it("instructs providers to use Notes and avoid CRM clarification", () => {
    const prompt = extractionPrompt({
      text: "Met John from Google. Very friendly.",
      sourceMessageId: "1",
      submittedBy: "Sara",
      currentDate: "2026-07-22",
      timezone: "America/Chicago",
      teamMemberAliases: ["Sara (aliases: S)"],
    });
    expect(prompt).toContain("organizations, roles, meeting context");
    expect(prompt).toContain("Never ask for a last name");
    expect(prompt).toContain('use "Contacted"');
  });

  it("does not interrupt for missing contact metadata", () => {
    const update = projectUpdateSchema.parse({
      ...validProjectUpdate,
      needsConfirmation: true,
      uncertainties: [
        {
          field: "organization",
          itemType: "contact",
          explanation: "Organization was not supplied",
          clarificationQuestion: "Where does this person work?",
          severity: "high",
        },
      ],
    });
    expect(clarificationMessage(update)).toBeNull();
  });

  it("still asks for a genuinely ambiguous team assignment", () => {
    const update = projectUpdateSchema.parse({
      ...validProjectUpdate,
      needsConfirmation: true,
      uncertainties: [
        {
          field: "assignedToName",
          itemType: "task",
          explanation: "Two configured team members match Sam",
          clarificationQuestion: "Which Sam should own this task?",
          severity: "high",
        },
      ],
    });
    expect(clarificationMessage(update)).toContain("Which Sam");
  });
});
