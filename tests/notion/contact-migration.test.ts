import { describe, expect, it } from "vitest";
import {
  mergeContactTopics,
  normalizeContactStatus,
} from "@/notion/contact-migration";

describe("Contacts migration", () => {
  it("merges Could Help With and Expertise without losing order or duplicates", () => {
    expect(
      mergeContactTopics(["AI", "Python"], ["python", "Computer Vision"]),
    ).toEqual(["AI", "Python", "Computer Vision"]);
  });

  it("normalizes legacy statuses to the three supported values", () => {
    expect(normalizeContactStatus("Follow up later")).toBe("Need to Contact");
    expect(normalizeContactStatus("Met at CVPR")).toBe("Contacted");
    expect(normalizeContactStatus("Awaiting reply")).toBe(
      "Waiting for Response",
    );
    expect(normalizeContactStatus("VIP")).toBeNull();
  });
});
