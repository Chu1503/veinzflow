export type SendDigestInput = {
  recipients: string[];
  subject: string;
  text: string;
  html: string;
};
export type SendDigestResult = { id: string; provider: "gmail" | "resend" };
export interface EmailProvider {
  sendDigest(input: SendDigestInput): Promise<SendDigestResult>;
}
