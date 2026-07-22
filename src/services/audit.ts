export type AuditEvent = {
  updateId: string;
  userId: string;
  outcome: "accepted" | "rejected" | "failed";
  counts?: Record<string, number>;
};
