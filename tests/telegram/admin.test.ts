import { describe, expect, it, vi } from "vitest";
import {
  runTelegramAdmin,
  TelegramAdminApi,
} from "../../scripts/telegram-admin-core";

const env = {
  NODE_ENV: "test" as const,
  TELEGRAM_BOT_TOKEN: "test-bot-token",
  TELEGRAM_WEBHOOK_SECRET: "webhook-secret-for-tests",
  APP_URL: "https://veinzflow.vercel.app",
};

function telegramResponse(result: unknown, status = 200): Response {
  return Response.json(
    status === 200
      ? { ok: true, result }
      : { ok: false, error_code: status, description: "provider error" },
    { status },
  );
}

function output() {
  const logs: string[] = [];
  const warnings: string[] = [];
  return {
    logs,
    warnings,
    writer: {
      log: (message: string) => logs.push(message),
      warn: (message: string) => warnings.push(message),
    },
  };
}

describe("Telegram administration CLI", () => {
  it("sets the webhook with safe defaults and never logs secrets", async () => {
    const fetchMock = vi.fn().mockResolvedValue(telegramResponse(true));
    const consoleOutput = output();
    await runTelegramAdmin("webhook:set", [], {
      env,
      fetch: fetchMock,
      output: consoleOutput.writer,
    });
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      url: "https://veinzflow.vercel.app/api/telegram/webhook",
      secret_token: env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["message", "edited_message"],
      drop_pending_updates: false,
    });
    const rendered = consoleOutput.logs.join("\n");
    expect(rendered).not.toContain(env.TELEGRAM_BOT_TOKEN);
    expect(rendered).not.toContain(env.TELEGRAM_WEBHOOK_SECRET);
  });

  it("reports webhook status and operational warnings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      telegramResponse({
        url: "https://old.example/api/telegram/webhook",
        pending_update_count: 4,
        last_error_date: Math.floor(Date.now() / 1000),
        last_error_message: "Wrong response from the webhook: 500",
        allowed_updates: ["message"],
      }),
    );
    const consoleOutput = output();
    await runTelegramAdmin("webhook:status", [], {
      env,
      fetch: fetchMock,
      output: consoleOutput.writer,
    });
    expect(consoleOutput.logs).toContain("Pending updates: 4");
    expect(consoleOutput.warnings.join("\n")).toContain(
      "does not match APP_URL",
    );
    expect(consoleOutput.warnings.join("\n")).toContain("pending update");
    expect(consoleOutput.warnings.join("\n")).toContain("last 24 hours");
  });

  it("preserves pending updates on normal delete", async () => {
    const fetchMock = vi.fn().mockResolvedValue(telegramResponse(true));
    await runTelegramAdmin("webhook:delete", [], { env, fetch: fetchMock });
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      drop_pending_updates: false,
    });
  });

  it("refuses destructive flush without confirmation", async () => {
    const fetchMock = vi.fn();
    await expect(
      runTelegramAdmin("webhook:flush", [], { env, fetch: fetchMock }),
    ).rejects.toThrow("DESTRUCTIVE OPERATION REFUSED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("flushes pending updates only with confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(telegramResponse(true));
    await runTelegramAdmin("webhook:flush", ["--confirm"], {
      env,
      fetch: fetchMock,
    });
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      drop_pending_updates: true,
    });
  });

  it("resets without dropping updates and verifies the final URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(telegramResponse(true))
      .mockResolvedValueOnce(telegramResponse(true))
      .mockResolvedValueOnce(
        telegramResponse({
          url: "https://veinzflow.vercel.app/api/telegram/webhook",
          pending_update_count: 0,
        }),
      );
    await runTelegramAdmin("webhook:reset", [], {
      env,
      fetch: fetchMock,
      sleep: async () => undefined,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const deleteRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(deleteRequest.body))).toEqual({
      drop_pending_updates: false,
    });
  });

  it("tests bot identity and optionally sends a message", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        telegramResponse({
          id: 123,
          is_bot: true,
          first_name: "VeinzFlow",
          username: "veinzflow_bot",
        }),
      )
      .mockResolvedValueOnce(telegramResponse({ message_id: 99 }));
    const consoleOutput = output();
    await runTelegramAdmin(
      "test",
      ["--chat-id", "123456789", "--message", "hello"],
      { env, fetch: fetchMock, output: consoleOutput.writer },
    );
    expect(consoleOutput.logs.join("\n")).toContain("@veinzflow_bot");
    expect(consoleOutput.logs.join("\n")).not.toContain("123456789");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [401, "rejected the bot token"],
    [404, "endpoint was not found"],
    [429, "rate limit exceeded"],
    [503, "temporarily unavailable"],
  ])("handles Telegram HTTP %s safely", async (status, message) => {
    const api = new TelegramAdminApi(
      env.TELEGRAM_BOT_TOKEN,
      vi.fn().mockResolvedValue(telegramResponse(undefined, status)),
    );
    await expect(api.getMe()).rejects.toThrow(message);
  });

  it("converts network failures into safe administration errors", async () => {
    const api = new TelegramAdminApi(
      env.TELEGRAM_BOT_TOKEN,
      vi.fn().mockRejectedValue(new Error("DNS lookup failed")),
    );
    await expect(api.getMe()).rejects.toThrow(
      "Telegram network request failed: DNS lookup failed",
    );
  });
});
