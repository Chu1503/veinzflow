import { loadEnvironment } from "./load-environment";

async function main(): Promise<void> {
  loadEnvironment();
  const [{ parseEnv }, { TelegramClient }] = await Promise.all([
    import("../src/config/env"),
    import("../src/telegram/client"),
  ]);
  const env = parseEnv();
  if (!env.TELEGRAM_BOT_TOKEN)
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  await new TelegramClient(env.TELEGRAM_BOT_TOKEN).deleteWebhook();
  console.log("Telegram webhook deleted.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
