import { loadEnvironment } from "./load-environment";

async function main(): Promise<void> {
  loadEnvironment();
  const { parseEnv } = await import("../src/config/env");
  const env = parseEnv(process.env, true);
  console.log(
    `Environment is ready for ${env.APP_NAME}. Providers: ${env.TRANSCRIPTION_PROVIDER}/${env.EXTRACTION_PROVIDER}/${env.DIGEST_PROVIDER}/${env.EMAIL_PROVIDER}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
