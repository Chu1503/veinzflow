import { parseEnv } from "../src/config/env";
import { TelegramClient } from "../src/telegram/client";
const env = parseEnv();
if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required");
await new TelegramClient(env.TELEGRAM_BOT_TOKEN).deleteWebhook();
console.log("Telegram webhook deleted.");
