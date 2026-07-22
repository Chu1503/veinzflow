import type { WriteResult } from "@/notion/records";
export function successReply(results: WriteResult[]): string {
  const labels = {
    contact: "Contact update",
    resource: "Resource",
    task: "Task",
    log: "Project log",
  };
  const active = results.filter((item) => item.action !== "skipped");
  if (!active.length)
    return "This update was already processed; no duplicate records were created.";
  return `Added:\n${active.map((item) => `• ${labels[item.kind]}: ${item.title}`).join("\n")}`;
}
export function errorReply(): string {
  return "I could not finish saving that update. The error was logged safely; please try again or contact the project administrator.";
}
