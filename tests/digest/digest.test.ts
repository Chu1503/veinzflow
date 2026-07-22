import { describe, expect, it } from "vitest";
import { isDigestScheduledDay } from "@/digest/schedule";
import { renderDigest } from "@/digest/render";
const data = {
  periodStart: "2026-07-19",
  periodEnd: "2026-07-21",
  logEntries: ["Experiment completed"],
  completedTasks: [],
  activeTasks: [],
  resources: [],
  questions: [],
};
describe("digest", () => {
  it("uses deterministic alternate calendar days", () => {
    const first = isDigestScheduledDay(
      new Date("2026-07-22T18:00:00Z"),
      "America/Chicago",
    );
    const next = isDigestScheduledDay(
      new Date("2026-07-23T18:00:00Z"),
      "America/Chicago",
    );
    const twoDaysLater = isDigestScheduledDay(
      new Date("2026-07-24T18:00:00Z"),
      "America/Chicago",
    );
    expect(next).toBe(!first);
    expect(twoDaysLater).toBe(first);
  });
  it("renders a deterministic fallback", () => {
    const digest = renderDigest(data);
    expect(digest.text).toContain("Experiment completed");
    expect(digest.html).toContain("What happened");
  });
});
