import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppEnv, TeamMember } from "@/config/env";
import type { NormalizedSubmission } from "@/telegram/types";
import { projectUpdateSchema } from "@/schemas/project-update";

const mocks = vi.hoisted(() => ({
  extract: vi.fn(),
  transcribe: vi.fn(),
  download: vi.fn(),
  applyCrud: vi.fn(),
}));

vi.mock("@/ai/extraction", () => ({
  createExtractionProvider: () => ({ extract: mocks.extract }),
}));
vi.mock("@/ai/transcription", () => ({
  createTranscriptionProvider: () => ({ transcribe: mocks.transcribe }),
}));
vi.mock("@/telegram/files", () => ({
  downloadTelegramFile: mocks.download,
}));
vi.mock("@/services/apply-crud-operation", () => ({
  applyCrudOperation: mocks.applyCrud,
}));

import { processSubmission } from "@/services/process-submission";

const member = {
  name: "Sara",
  telegramUserId: "7",
  email: "sara@example.com",
  aliases: [],
} as TeamMember;
const env = {
  APP_TIMEZONE: "UTC",
  MAX_AUDIO_DURATION_SECONDS: 300,
  MAX_AUDIO_BYTES: 10_000,
  MAX_TEXT_LENGTH: 10_000,
  MAX_AI_ATTEMPTS: 1,
  TELEGRAM_BOT_TOKEN: "test-token",
  teamMembers: [member],
} as unknown as AppEnv;
const baseSubmission = {
  updateId: "1",
  messageId: "10",
  chatId: "55",
  userId: "7",
  userLabel: "Sara",
  documentMetadata: null,
} as const;

function crud(intent: "UPDATE" | "DELETE") {
  return projectUpdateSchema.parse({
    intent,
    entityType: "TASK",
    searchText: "last task",
    changes: intent === "UPDATE" ? { taskStatus: "Done" } : {},
    submissionSummary: "CRUD",
    contacts: [],
    resources: [],
    tasks: [],
    logEntries: [],
    uncertainties: [],
    confidence: 1,
    needsConfirmation: false,
  });
}

describe("text and voice CRUD routing", () => {
  beforeEach(() => {
    mocks.download.mockResolvedValue({
      data: new Uint8Array([1, 2, 3]),
      filename: "voice.ogg",
    });
    mocks.transcribe.mockResolvedValue({
      text: "delete last task",
      provider: "groq",
      model: "whisper",
    });
    mocks.applyCrud.mockResolvedValue({ reply: "done", result: { id: "1" } });
  });

  it("routes a natural text edit without creating records", async () => {
    mocks.extract.mockResolvedValueOnce(crud("UPDATE"));
    const submission: NormalizedSubmission = {
      ...baseSubmission,
      text: "mark the last task complete",
      file: null,
    };
    const result = await processSubmission({
      submission,
      member,
      env,
      notion: {} as never,
      telegram: {} as never,
    });
    expect(result.reply).toBe("done");
    expect(mocks.applyCrud).toHaveBeenCalledOnce();
  });

  it.each([
    ["DELETE", "delete last task"],
    ["UPDATE", "mark last task complete"],
  ] as const)(
    "routes a voice %s after transcription",
    async (intent, transcript) => {
      mocks.transcribe.mockResolvedValueOnce({
        text: transcript,
        provider: "groq",
        model: "whisper",
      });
      mocks.extract.mockResolvedValueOnce(crud(intent));
      const submission: NormalizedSubmission = {
        ...baseSubmission,
        text: null,
        file: {
          kind: "voice",
          file_id: "voice",
          file_unique_id: "voice-1",
          duration: 2,
          file_size: 3,
          mime_type: "audio/ogg",
        },
      };
      await processSubmission({
        submission,
        member,
        env,
        notion: {} as never,
        telegram: {} as never,
      });
      expect(mocks.extract).toHaveBeenCalledWith(
        expect.objectContaining({ text: transcript }),
      );
      expect(mocks.applyCrud).toHaveBeenCalled();
    },
  );
});
