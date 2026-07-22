import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/telegram/webhook/route";

describe("Telegram webhook security", () => {
  it("rejects a missing or incorrect webhook secret before parsing content", async () => {
    const response = await POST(
      new Request("http://localhost/api/telegram/webhook", {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": "wrong" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(401);
  });
});
