import { parseEnv } from "../src/config/env";
import { TelegramClient } from "../src/telegram/client";
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
