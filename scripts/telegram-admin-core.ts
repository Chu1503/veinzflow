type Fetch = typeof fetch;

type TelegramEnvelope<T> = {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number };
};

export type TelegramWebhookInfo = {
  url: string;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  allowed_updates?: string[];
};

type TelegramBot = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

type Output = Pick<Console, "log" | "warn">;

export type TelegramAdminDependencies = {
  fetch?: Fetch;
  output?: Output;
  sleep?: (milliseconds: number) => Promise<void>;
  env?: NodeJS.ProcessEnv;
};

export class TelegramAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramAdminError";
  }
}

const ALLOWED_UPDATES = ["message", "edited_message"];
const WEBHOOK_PATH = "/api/telegram/webhook";
const RATE_LIMIT_MESSAGE = "Telegram rate limit exceeded";

function safeText(value: unknown, token = ""): string {
  const text = typeof value === "string" ? value : "Unknown Telegram error";
  const withoutToken = token ? text.replaceAll(token, "[REDACTED]") : text;
  return withoutToken
    .replace(/\b\d{6,}:[A-Za-z0-9_-]{20,}\b/g, "[REDACTED]")
    .replace(/(token|secret|api[-_ ]?key)(\s*[:=]\s*)\S+/gi, "$1$2[REDACTED]")
    .slice(0, 500);
}

function normalizeAppUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TelegramAdminError("APP_URL or --url must be a valid URL.");
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new TelegramAdminError("APP_URL must use HTTP or HTTPS.");
  if (url.pathname !== "/" || url.search || url.hash)
    throw new TelegramAdminError(
      "APP_URL must be an origin without a path, query, or fragment.",
    );
  return url.origin;
}

function expectedWebhookUrl(appUrl: string): string {
  return `${normalizeAppUrl(appUrl)}${WEBHOOK_PATH}`;
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--"))
    throw new TelegramAdminError(`${name} requires a value.`);
  return value;
}

function flag(args: string[], name: string): boolean {
  return args.includes(name);
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new TelegramAdminError(`${name} is required.`);
  return value;
}

function appUrlFrom(env: NodeJS.ProcessEnv, args: string[]): string {
  const value = option(args, "--url") ?? env.APP_URL?.trim();
  if (!value)
    throw new TelegramAdminError(
      "APP_URL is required. Set it in .env.local or pass --url <origin>.",
    );
  return normalizeAppUrl(value);
}

function maskIdentifier(value: string): string {
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}…${value.slice(-3)}`;
}

function errorDate(timestamp?: number): string {
  return timestamp ? new Date(timestamp * 1000).toISOString() : "none";
}

export class TelegramAdminApi {
  constructor(
    private readonly token: string,
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  private async call<T>(
    method: string,
    payload: Record<string, unknown> = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await this.fetchImpl(
        `https://api.telegram.org/bot${this.token}/${method}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError")
        throw new TelegramAdminError("Telegram request timed out.");
      throw new TelegramAdminError(
        `Telegram network request failed: ${safeText(error instanceof Error ? error.message : error, this.token)}`,
      );
    } finally {
      clearTimeout(timer);
    }

    let envelope: TelegramEnvelope<T>;
    try {
      envelope = (await response.json()) as TelegramEnvelope<T>;
    } catch {
      throw new TelegramAdminError(
        `Telegram returned an unreadable response (HTTP ${response.status}).`,
      );
    }

    const code = envelope.error_code ?? response.status;
    if (response.ok && envelope.ok && envelope.result !== undefined)
      return envelope.result;
    if (code === 401)
      throw new TelegramAdminError(
        "Telegram rejected the bot token (401). Verify TELEGRAM_BOT_TOKEN.",
      );
    if (code === 404)
      throw new TelegramAdminError(
        "Telegram endpoint was not found (404). The bot token may be malformed.",
      );
    if (code === 429) {
      const retryAfter = envelope.parameters?.retry_after;
      throw new TelegramAdminError(
        `${RATE_LIMIT_MESSAGE} (429).${retryAfter ? ` Try again after ${retryAfter} seconds.` : " Try again later."}`,
      );
    }
    if (code >= 500)
      throw new TelegramAdminError(
        `Telegram is temporarily unavailable (HTTP ${code}). Try again later.`,
      );
    throw new TelegramAdminError(
      `Telegram ${method} failed (HTTP ${code}): ${safeText(envelope.description, this.token)}`,
    );
  }

  getMe(): Promise<TelegramBot> {
    return this.call<TelegramBot>("getMe");
  }

  getWebhookInfo(): Promise<TelegramWebhookInfo> {
    return this.call<TelegramWebhookInfo>("getWebhookInfo");
  }

  setWebhook(url: string, secret: string): Promise<boolean> {
    return this.call<boolean>("setWebhook", {
      url,
      secret_token: secret,
      allowed_updates: ALLOWED_UPDATES,
      drop_pending_updates: false,
    });
  }

  deleteWebhook(dropPending: boolean): Promise<boolean> {
    return this.call<boolean>("deleteWebhook", {
      drop_pending_updates: dropPending,
    });
  }

  sendMessage(chatId: string, text: string): Promise<{ message_id: number }> {
    return this.call<{ message_id: number }>("sendMessage", {
      chat_id: chatId,
      text,
    });
  }
}

function printWebhookStatus(
  info: TelegramWebhookInfo,
  output: Output,
  appUrl?: string,
): string[] {
  const warnings: string[] = [];
  output.log(`Webhook URL: ${info.url || "(empty)"}`);
  output.log(`Pending updates: ${info.pending_update_count}`);
  output.log(`Last error date: ${errorDate(info.last_error_date)}`);
  output.log(`Last error message: ${info.last_error_message || "none"}`);
  output.log(
    `Allowed updates: ${info.allowed_updates?.join(", ") || "(not reported)"}`,
  );
  if (!info.url)
    warnings.push("Webhook URL is empty; Telegram delivery is disabled.");
  if (appUrl && info.url && info.url !== expectedWebhookUrl(appUrl))
    warnings.push(
      `Webhook URL does not match APP_URL (${expectedWebhookUrl(appUrl)}).`,
    );
  if (!appUrl)
    warnings.push("APP_URL is not configured, so URL matching was skipped.");
  if (info.pending_update_count > 0)
    warnings.push(
      `${info.pending_update_count} pending update(s) are queued; check whether the count is increasing.`,
    );
  if (
    info.last_error_date &&
    Date.now() - info.last_error_date * 1000 <= 24 * 60 * 60 * 1000
  )
    warnings.push(
      `Telegram reported a webhook error in the last 24 hours: ${safeText(info.last_error_message)}`,
    );
  for (const warning of warnings) output.warn(`WARNING: ${warning}`);
  return warnings;
}

async function fetchHealth(
  fetchImpl: Fetch,
  appUrl: string,
): Promise<{ status?: string; services?: { telegram?: boolean } }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetchImpl(`${normalizeAppUrl(appUrl)}/api/health`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok)
      throw new TelegramAdminError(
        `VeinzFlow health endpoint returned HTTP ${response.status}.`,
      );
    return (await response.json()) as {
      status?: string;
      services?: { telegram?: boolean };
    };
  } catch (error) {
    if (error instanceof TelegramAdminError) throw error;
    throw new TelegramAdminError(
      `VeinzFlow health check failed: ${safeText(error instanceof Error ? error.message : error)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function runTelegramAdmin(
  command: string | undefined,
  args: string[],
  dependencies: TelegramAdminDependencies = {},
): Promise<void> {
  const env = dependencies.env ?? process.env;
  const output = dependencies.output ?? console;
  const fetchImpl = dependencies.fetch ?? fetch;
  const sleep =
    dependencies.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  if (!command)
    throw new TelegramAdminError(
      "A command is required: webhook:set, webhook:status, webhook:delete, webhook:reset, webhook:flush, test, or doctor.",
    );

  const token = requiredEnv(env, "TELEGRAM_BOT_TOKEN");
  const api = new TelegramAdminApi(token, fetchImpl);

  if (command === "webhook:set") {
    const secret = requiredEnv(env, "TELEGRAM_WEBHOOK_SECRET");
    const webhookUrl = expectedWebhookUrl(appUrlFrom(env, args));
    await api.setWebhook(webhookUrl, secret);
    output.log(`SUCCESS: Telegram webhook registered at ${webhookUrl}.`);
    output.log("Pending updates were preserved.");
    return;
  }

  if (command === "webhook:status") {
    const appUrl = option(args, "--url") ?? env.APP_URL?.trim();
    const info = await api.getWebhookInfo();
    printWebhookStatus(
      info,
      output,
      appUrl ? normalizeAppUrl(appUrl) : undefined,
    );
    return;
  }

  if (command === "webhook:delete") {
    const dropPending = flag(args, "--drop-pending");
    await api.deleteWebhook(dropPending);
    output.log("SUCCESS: Telegram webhook deleted.");
    output.log(
      dropPending
        ? "WARNING: Pending Telegram updates were discarded."
        : "Pending updates were preserved.",
    );
    return;
  }

  if (command === "webhook:reset") {
    const secret = requiredEnv(env, "TELEGRAM_WEBHOOK_SECRET");
    const webhookUrl = expectedWebhookUrl(appUrlFrom(env, args));
    await api.deleteWebhook(false);
    output.log("Webhook deleted; pending updates were preserved.");
    await sleep(1_000);
    await api.setWebhook(webhookUrl, secret);
    const info = await api.getWebhookInfo();
    if (info.url !== webhookUrl)
      throw new TelegramAdminError(
        `Webhook reset verification failed. Expected ${webhookUrl}, received ${info.url || "an empty URL"}.`,
      );
    output.log(
      `SUCCESS: Telegram webhook reset and verified at ${webhookUrl}.`,
    );
    return;
  }

  if (command === "webhook:flush") {
    if (!flag(args, "--confirm"))
      throw new TelegramAdminError(
        "DESTRUCTIVE OPERATION REFUSED: rerun with --confirm to discard all pending Telegram updates.",
      );
    await api.deleteWebhook(true);
    output.warn(
      "DESTRUCTIVE: Telegram webhook deleted and pending updates discarded.",
    );
    return;
  }

  if (command === "test") {
    const bot = await api.getMe();
    output.log(
      `SUCCESS: Configured bot is @${bot.username ?? "(username not set)"} (${bot.first_name}).`,
    );
    const chatId = option(args, "--chat-id");
    const message = option(args, "--message");
    if (Boolean(chatId) !== Boolean(message))
      throw new TelegramAdminError(
        "--chat-id and --message must be supplied together to send a test message.",
      );
    if (chatId && message) {
      const sent = await api.sendMessage(chatId, message);
      output.log(
        `SUCCESS: Test message ${sent.message_id} sent to chat ${maskIdentifier(chatId)}.`,
      );
    }
    return;
  }

  if (command === "doctor") {
    const issues: string[] = [];
    const secret = env.TELEGRAM_WEBHOOK_SECRET?.trim();
    const appUrlValue = option(args, "--url") ?? env.APP_URL?.trim();
    if (!secret) issues.push("TELEGRAM_WEBHOOK_SECRET is missing.");
    if (!appUrlValue) issues.push("APP_URL is missing.");
    let bot: TelegramBot | undefined;
    try {
      bot = await api.getMe();
      output.log(
        `PASS: Telegram bot @${bot.username ?? "(username not set)"} is reachable.`,
      );
    } catch (error) {
      issues.push(error instanceof Error ? error.message : "getMe failed.");
    }
    try {
      const info = await api.getWebhookInfo();
      const warnings = printWebhookStatus(
        info,
        output,
        appUrlValue ? normalizeAppUrl(appUrlValue) : undefined,
      );
      issues.push(...warnings);
    } catch (error) {
      issues.push(
        error instanceof Error ? error.message : "getWebhookInfo failed.",
      );
    }
    if (appUrlValue)
      try {
        const health = await fetchHealth(fetchImpl, appUrlValue);
        if (health.status !== "ok")
          issues.push("VeinzFlow health endpoint did not report status=ok.");
        else output.log("PASS: VeinzFlow health endpoint is reachable.");
        if (health.services?.telegram !== true)
          issues.push(
            "Production health reports Telegram as unconfigured; check Vercel environment variables and redeploy.",
          );
      } catch (error) {
        issues.push(
          error instanceof Error ? error.message : "Health check failed.",
        );
      }
    if (!bot?.username)
      issues.push(
        "Telegram getMe returned no bot username; configure one with BotFather.",
      );
    if (issues.length) {
      for (const issue of [...new Set(issues)]) output.warn(`ISSUE: ${issue}`);
      throw new TelegramAdminError(
        `Telegram doctor found ${new Set(issues).size} issue(s). Likely causes include stale Vercel environment settings, an invalid token, an incorrect APP_URL, or a failed deployment.`,
      );
    }
    output.log("SUCCESS: Telegram doctor found no problems.");
    return;
  }

  throw new TelegramAdminError(`Unknown Telegram admin command: ${command}`);
}
