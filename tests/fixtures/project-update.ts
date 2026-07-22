export const validProjectUpdate = {
  submissionSummary: "Met Dr. Patel and agreed to send the equipment list.",
  contacts: [
    {
      name: "Dr. Patel",
      contactDetails: null,
      contactStatus: "Contacted",
      expertise: ["Ultrasound"],
      notes:
        "Professor at Central Lab. Discussed ultrasound equipment and requested an equipment list.",
      sourceMessageId: "42",
      confidence: 0.95,
    },
  ],
  resources: [],
  tasks: [
    {
      title: "Send equipment list",
      status: "Not Started",
      assignedToName: "Sara",
      notes: "Send the equipment list requested during the meeting.",
      sourceMessageId: "42",
      confidence: 0.9,
    },
  ],
  logEntries: [
    {
      title: "Meeting with Dr. Patel",
      date: "2026-07-21",
      outcome:
        "Discussed equipment access. Dr. Patel requested the equipment list.",
      questions: [],
      nextSteps: ["Send equipment list"],
      sourceMessageId: "42",
      confidence: 0.95,
    },
  ],
  uncertainties: [],
  confidence: 0.94,
  needsConfirmation: false,
};
