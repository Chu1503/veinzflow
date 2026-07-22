import { Resend } from "resend";
import type {
  EmailProvider,
  SendDigestInput,
  SendDigestResult,
} from "./contracts";
export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;
  constructor(
    apiKey: string,
    private readonly sender: string,
    client?: Resend,
  ) {
    this.client = client ?? new Resend(apiKey);
  }
  async sendDigest(input: SendDigestInput): Promise<SendDigestResult> {
    const response = await this.client.emails.send({
      from: this.sender,
      to: input.recipients,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    if (response.error) throw new Error(response.error.message);
    return { id: response.data?.id ?? "unknown", provider: "resend" };
  }
}
