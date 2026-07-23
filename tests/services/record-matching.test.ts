import { describe, expect, it } from "vitest";
import { findRecordMatches } from "@/services/record-matching";

const records = [
  { id: "1", title: "Finish report", createdTime: "2026-07-20T10:00:00.000Z" },
  { id: "2", title: "Research", createdTime: "2026-07-21T10:00:00.000Z" },
  { id: "3", title: "Research", createdTime: "2026-07-22T10:00:00.000Z" },
  { id: "4", title: "Latest task", createdTime: "2026-07-23T10:00:00.000Z" },
];

describe("record matching", () => {
  it("ignores case, punctuation, whitespace, and simple pluralization", () => {
    const result = findRecordMatches(records, "DELETE tasks: FINISH   REPORT!");
    expect(result.kind).toBe("one");
    if (result.kind === "one") expect(result.candidate.id).toBe("1");
  });

  it("uses created time for last and previous references", () => {
    const result = findRecordMatches(records, "delete last task");
    expect(result.kind).toBe("one");
    if (result.kind === "one") expect(result.candidate.id).toBe("4");
  });

  it("returns all equally exact matches for clarification", () => {
    const result = findRecordMatches(records, "Research");
    expect(result.kind).toBe("many");
    if (result.kind === "many") expect(result.candidates).toHaveLength(2);
  });
});
