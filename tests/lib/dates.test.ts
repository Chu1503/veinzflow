import { describe, expect, it } from "vitest";
import { dateInTimezone } from "@/lib/dates";
describe("relative-date context", () => {
  it("produces the current date in the configured timezone", () =>
    expect(
      dateInTimezone(new Date("2026-07-22T02:00:00Z"), "America/Chicago"),
    ).toBe("2026-07-21"));
});
