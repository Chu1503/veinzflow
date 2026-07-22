import { describe, expect, it } from "vitest";
import { isDigestDue } from "@/digest/schedule";
import { renderDigest } from "@/digest/render";
const data = {
  periodStart: "2026-07-19",
  periodEnd: "2026-07-21",
  logEntries: ["Experiment completed"],
  completedTasks: [],
  upcomingTasks: [],
  overdueTasks: [],
  blockedTasks: [],
  unassignedHighPriorityTasks: [],
  contactFollowUps: [],
  decisions: [],
  resources: [],
  unresolvedQuestions: [],
};
describe("digest", () => {
  it("is due after two calendar days", () => {
    expect(
      isDigestDue(
        "2026-07-19T23:00:00Z",
        new Date("2026-07-22T05:00:00Z"),
        "America/Chicago",
      ),
    ).toBe(true);
    expect(
      isDigestDue(
        "2026-07-21T05:00:00Z",
        new Date("2026-07-22T04:00:00Z"),
        "America/Chicago",
      ),
    ).toBe(false);
  });
  it("renders a deterministic fallback", () => {
    const digest = renderDigest(data);
    expect(digest.text).toContain("Experiment completed");
    expect(digest.html).toContain("What happened");
  });
});
