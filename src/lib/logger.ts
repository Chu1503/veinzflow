import { redact } from "@/security/redact";
export const logger = {
  info: (message: string, data?: unknown) =>
    console.info(message, redact(data)),
  error: (message: string, data?: unknown) =>
    console.error(message, redact(data)),
};
