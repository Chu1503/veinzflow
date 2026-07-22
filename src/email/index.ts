import type { AppEnv } from "@/config/env";
import type { EmailProvider } from "./contracts";
import { GmailEmailProvider } from "./gmail";
import { ResendEmailProvider } from "./resend";
export function createEmailProvider(env: AppEnv): EmailProvider {
  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL)
      throw new Error("Resend is not configured");
    return new ResendEmailProvider(env.RESEND_API_KEY, env.RESEND_FROM_EMAIL);
  }
  if (
    !env.GMAIL_CLIENT_ID ||
    !env.GMAIL_CLIENT_SECRET ||
    !env.GMAIL_REFRESH_TOKEN ||
    !env.GMAIL_SENDER_EMAIL
  )
    throw new Error("Gmail is not configured");
  return new GmailEmailProvider({
    clientId: env.GMAIL_CLIENT_ID,
    clientSecret: env.GMAIL_CLIENT_SECRET,
    refreshToken: env.GMAIL_REFRESH_TOKEN,
    sender: env.GMAIL_SENDER_EMAIL,
  });
}
