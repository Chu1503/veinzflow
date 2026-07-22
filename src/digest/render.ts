import type { DigestInput, ProjectDigest } from "@/schemas/digest";

const sections: Array<[keyof DigestInput, string]> = [
  ["logEntries", "What happened"],
  ["completedTasks", "Completed work"],
  ["decisions", "Decisions"],
  ["upcomingTasks", "Coming up"],
  ["overdueTasks", "Overdue"],
  ["blockedTasks", "Blocked"],
  ["unassignedHighPriorityTasks", "Unassigned high-priority work"],
  ["unresolvedQuestions", "Open questions"],
  ["contactFollowUps", "Contact follow-ups"],
  ["resources", "Recently added resources"],
];

export function renderDigest(input: DigestInput): ProjectDigest {
  const subject = `VeinzFlow Project Update — ${input.periodEnd}`;
  const blocks = sections.map(([key, title]) => {
    const values = input[key] as string[];
    return `${title}\n${values.length ? values.map((value) => `- ${value}`).join("\n") : "- Nothing to report"}`;
  });
  const text = `VeinzFlow Project Update\nReporting period: ${input.periodStart} to ${input.periodEnd}\n\n${blocks.join("\n\n")}`;
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character]!,
    );
  const html = `<h1>VeinzFlow Project Update</h1><p>Reporting period: ${escape(input.periodStart)} to ${escape(input.periodEnd)}</p>${sections.map(([key, title]) => `<h2>${title}</h2><ul>${((input[key] as string[]).length ? (input[key] as string[]) : ["Nothing to report"]).map((value) => `<li>${escape(value)}</li>`).join("")}</ul>`).join("")}`;
  return { subject, text, html };
}
