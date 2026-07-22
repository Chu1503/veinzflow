import { parseEnv } from "../src/config/env";
try {
  const env = parseEnv(process.env, true);
  console.log(
    `Environment is ready for ${env.APP_NAME}. Providers: ${env.TRANSCRIPTION_PROVIDER}/${env.EXTRACTION_PROVIDER}/${env.DIGEST_PROVIDER}/${env.EMAIL_PROVIDER}.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
