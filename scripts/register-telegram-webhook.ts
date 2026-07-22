import { loadEnvironment } from "./load-environment";

async function main(): Promise<void> {
  loadEnvironment();
  const [{ parseEnv }, { TelegramClient }] = await Promise.all([
    import("../src/config/env"),
    import("../src/telegram/client"),
  ]);
  const env = parseEnv();
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET)
    throw new Error(
      "TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET are required",
    );
  const url = `${env.APP_URL.replace(/\/$/, "")}/api/telegram/webhook`;
  await new TelegramClient(env.TELEGRAM_BOT_TOKEN).setWebhook(
    url,
    env.TELEGRAM_WEBHOOK_SECRET,
  );
  console.log(`Telegram webhook registered at ${url}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
