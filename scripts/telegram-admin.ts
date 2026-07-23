import { loadEnvironment } from "./load-environment";

async function main(): Promise<void> {
  loadEnvironment();
  const { runTelegramAdmin } = await import("./telegram-admin-core");
  const [command, ...args] = process.argv.slice(2);
  await runTelegramAdmin(command, args);
}

main().catch((error: unknown) => {
  console.error(
    `FAILED: ${error instanceof Error ? error.message : "Unknown Telegram administration error"}`,
  );
  process.exitCode = 1;
});
