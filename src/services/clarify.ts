import type { ProjectUpdate } from "@/schemas/project-update";
export function clarificationMessage(update: ProjectUpdate): string | null {
  if (!update.needsConfirmation) return null;
  const questions = update.uncertainties
    .filter(
      (item) =>
        item.severity === "high" &&
        /assign|assignee|collaborator|participant|team\s*member/i.test(
          `${item.field} ${item.itemType} ${item.explanation}`,
        ),
    )
    .map((item, index) => `${index + 1}. ${item.clarificationQuestion}`);
  if (!questions.length) return null;
  return `${update.submissionSummary}\n\nI need clarification before saving uncertain details:\n${questions.join("\n")}`;
}
