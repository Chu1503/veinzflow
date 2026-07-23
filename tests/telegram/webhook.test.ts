import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  processSubmission: vi.fn(),
  sendMessage: vi.fn(),
  getNotionClient: vi.fn(() => ({})),
}));

vi.mock("@/services/process-submission", () => ({
  processSubmission: mocks.processSubmission,
}));
vi.mock("@/notion/client", () => ({
  getNotionClient: mocks.getNotionClient,
}));
vi.mock("@/telegram/client", () => ({
  TelegramClient: class {
    sendMessage = mocks.sendMessage;
  },
}));

import { POST } from "@/app/api/telegram/webhook/route";
import { resetTelegramUpdateLedger } from "@/telegram/update-idempotency";

const textUpdate = (updateId: number, userId = 7) => ({
  update_id: updateId,
  message: {
    message_id: updateId + 100,
    date: 1,
    chat: { id: 55, type: "private" },
    from: { id: userId, first_name: "Sara" },
    text: "Save this update",
  },
});

const voiceUpdate = (updateId: number) => ({
  ...textUpdate(updateId),
  message: {
    ...textUpdate(updateId).message,
    text: undefined,
    voice: {
      file_id: "voice-file",
      file_size: 100,
      duration: 2,
      mime_type: "audio/ogg",
    },
  },
});

const requestFor = (body: unknown, secret = "webhook-secret") =>
  new Request("http://localhost/api/telegram/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": secret,
    },
    body: JSON.stringify(body),
  });

describe("Telegram webhook", () => {
  beforeEach(() => {
    resetTelegramUpdateLedger();
    process.env.TELEGRAM_WEBHOOK_SECRET = "webhook-secret";
    process.env.TELEGRAM_BOT_TOKEN = "bot-test-token";
    process.env.ALLOWED_TELEGRAM_CHAT_IDS = "55";
    process.env.TEAM_MEMBERS_JSON = JSON.stringify([
      {
        name: "Sara",
        telegramUserId: "7",
        email: "sara@example.com",
        aliases: ["S"],
      },
    ]);
    mocks.processSubmission.mockResolvedValue({
      reply: "Saved",
      partial: false,
    });
    mocks.sendMessage.mockResolvedValue({ ok: true });
  });

  it("rejects an incorrect webhook secret", async () => {
    const response = await POST(requestFor(textUpdate(1), "wrong"));
    expect(response.status).toBe(401);
  });

  it("returns 200 for a successful text update", async () => {
    const response = await POST(requestFor(textUpdate(2)));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      processed: true,
    });
  });

  it("returns 200 for a successful voice update", async () => {
    const response = await POST(requestFor(voiceUpdate(3)));
    expect(response.status).toBe(200);
    expect(mocks.processSubmission).toHaveBeenCalledOnce();
  });

  it.each([
    ["notion_write", "Notion write failed"],
    ["transcription", "Transcription failed"],
    ["extraction", "Extraction failed"],
  ])(
    "handles a %s failure with one reply and HTTP 200",
    async (stage, message) => {
      mocks.processSubmission.mockImplementationOnce(async (input) => {
        input.onStage?.(stage);
        throw new Error(message);
      });
      const response = await POST(requestFor(textUpdate(10 + message.length)));
      expect(response.status).toBe(200);
      expect(mocks.sendMessage).toHaveBeenCalledOnce();
      expect(mocks.sendMessage.mock.calls[0]?.[1]).toContain(
        "I could not finish saving that update",
      );
    },
  );

  it("acknowledges an unauthorized user without asking Telegram to retry", async () => {
    const response = await POST(requestFor(textUpdate(30, 999)));
    expect(response.status).toBe(200);
    expect(mocks.processSubmission).not.toHaveBeenCalled();
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it("suppresses duplicate processing and duplicate replies by update_id", async () => {
    const update = textUpdate(40);
    const first = await POST(requestFor(update));
    const duplicate = await POST(requestFor(update));
    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(200);
    await expect(duplicate.json()).resolves.toMatchObject({ duplicate: true });
    expect(mocks.processSubmission).toHaveBeenCalledOnce();
    expect(mocks.sendMessage).toHaveBeenCalledOnce();
  });

  it("returns a controlled 200 when the error reply also fails", async () => {
    mocks.processSubmission.mockRejectedValueOnce(
      new Error("Extraction failed"),
    );
    mocks.sendMessage.mockRejectedValueOnce(new Error("Telegram unavailable"));
    const response = await POST(requestFor(textUpdate(50)));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      processed: false,
      errorHandled: true,
    });
  });

  it("acknowledges unsupported update types", async () => {
    const response = await POST(
      requestFor({ update_id: 60, message: { message_id: 61 } }),
    );
    expect(response.status).toBe(200);
    expect(mocks.processSubmission).not.toHaveBeenCalled();
  });

  it("acknowledges an invalid update shape without a retry", async () => {
    const response = await POST(requestFor({ message: {} }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      processed: false,
      errorHandled: true,
      validationFailed: true,
    });
  });
});
