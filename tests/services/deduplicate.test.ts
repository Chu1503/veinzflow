import { describe, expect, it } from "vitest";
import {
  canonicalUrl,
  findContactDuplicate,
  findResourceDuplicate,
} from "@/services/deduplicate";
describe("deduplication", () => {
  it("matches contacts by normalized contact details before name", () => {
    const result = findContactDuplicate(
      { name: "Different", contactDetails: "PATEL@example.com" },
      [
        {
          id: "1",
          name: "Dr. Patel",
          contactDetails: "patel@example.com",
        },
      ],
    );
    expect(result?.id).toBe("1");
  });
  it("canonicalizes resource tracking parameters", () => {
    expect(canonicalUrl("https://EXAMPLE.com/paper/?utm_source=x#top")).toBe(
      "https://example.com/paper",
    );
    expect(
      findResourceDuplicate(
        { title: "Other", link: "https://example.com/paper?utm_medium=y" },
        [{ id: "r", title: "Paper", link: "https://example.com/paper/" }],
      )?.id,
    ).toBe("r");
  });
});
