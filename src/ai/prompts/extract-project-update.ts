import type { ExtractionInput } from "../contracts";

export function extractionPrompt(input: ExtractionInput): string {
  return `You are VeinzFlow's careful research-operations extractor. Return only JSON matching the supplied schema.
Current date: ${input.currentDate}. Timezone: ${input.timezone}. Submitter: ${input.submittedBy}. Source message ID: ${input.sourceMessageId}.
Configured team-member names and aliases: ${input.teamMemberAliases?.join(", ") || "none"}. Resolve an assignment only when exactly one configured name or alias matches; otherwise leave it unassigned and request clarification.
Correct grammar without changing meaning. Preserve technical details. Resolve relative dates from the current date. Separate confirmed facts from possibilities, tasks from questions, and decisions from suggestions. Extract multiple records when present. Never invent names, owners, deadlines, outcomes, or claims. Use null or empty arrays when absent. Every item must use sourceMessageId ${input.sourceMessageId} and a 0-1 confidence. Set needsConfirmation when ambiguity affects identity, ownership, deadline, outcome, or decision status, and add a concrete clarification question.

Submission:
${input.text}`;
}
