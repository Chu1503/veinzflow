import type { DigestInput } from "@/schemas/digest";

export function digestPrompt(input: DigestInput): string {
  return `Create a concise VeinzFlow research project update for ${input.periodStart} to ${input.periodEnd}. Return JSON with subject, text, and html. Use these headings: What happened; Completed work; Active tasks; Questions; Recently added resources. Do not invent facts. Data: ${JSON.stringify(input)}`;
}
