import type { ProjectUpdate } from "@/schemas/project-update";
export function clarificationMessage(update: ProjectUpdate): string | null {
  if (!update.needsConfirmation) return null;
  const questions = update.uncertainties
    .filter((item) => item.severity !== "low")
    .map((item, index) => `${index + 1}. ${item.clarificationQuestion}`);
  return `${update.submissionSummary}\n\nI need clarification before saving uncertain details:\n${questions.join("\n")}`;
}
