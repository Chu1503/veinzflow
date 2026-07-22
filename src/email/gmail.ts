import { google } from "googleapis";
import type {
  EmailProvider,
  SendDigestInput,
  SendDigestResult,
} from "./contracts";

export class GmailEmailProvider implements EmailProvider {
  constructor(
    private readonly config: {
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      sender: string;
    },
  ) {}
  async sendDigest(input: SendDigestInput): Promise<SendDigestResult> {
    const auth = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
    );
    auth.setCredentials({ refresh_token: this.config.refreshToken });
    const mime = [
      `From: VeinzFlow <${this.config.sender}>`,
      `To: ${input.recipients.join(", ")}`,
      `Subject: ${input.subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      input.html,
    ].join("\r\n");
    const raw = Buffer.from(mime).toString("base64url");
    const response = await google
      .gmail({ version: "v1", auth })
      .users.messages.send({ userId: "me", requestBody: { raw } });
    return { id: response.data.id ?? "unknown", provider: "gmail" };
  }
}
