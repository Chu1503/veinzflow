import { AppError } from "@/lib/errors";
export class TelegramClient {
  constructor(private readonly token: string) {}
  private async call<T>(method: string, body?: object): Promise<T> {
    const response = await fetch(
      `https://api.telegram.org/bot${this.token}/${method}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      },
    );
    if (!response.ok)
      throw new AppError(
        "telegram_api",
        `Telegram ${method} failed`,
        502,
        response.status >= 500,
      );
    const payload = (await response.json()) as {
      ok: boolean;
      result: T;
      description?: string;
    };
    if (!payload.ok)
      throw new AppError(
        "telegram_api",
        payload.description ?? `Telegram ${method} failed`,
        502,
      );
    return payload.result;
  }
  sendMessage(chatId: string, text: string): Promise<unknown> {
    return this.call("sendMessage", { chat_id: chatId, text });
  }
  getFile(fileId: string): Promise<{ file_path: string; file_size?: number }> {
    return this.call("getFile", { file_id: fileId });
  }
  setWebhook(url: string, secretToken: string): Promise<unknown> {
    return this.call("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "edited_message"],
    });
  }
  deleteWebhook(): Promise<unknown> {
    return this.call("deleteWebhook", { drop_pending_updates: false });
  }
}
