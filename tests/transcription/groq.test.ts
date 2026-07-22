import OpenAI from "openai";
import { describe, expect, it } from "vitest";
import { parseEnv } from "@/config/env";
import { createTranscriptionProvider } from "@/ai/transcription";
import {
  GroqTranscriptionProvider,
  type GroqTranscriptionClient,
} from "@/ai/transcription/groq";
import { OpenAITranscriptionProvider } from "@/ai/transcription/openai";

const audio = {
  data: new Uint8Array([1, 2, 3]),
  filename: "telegram-voice.ogg",
  mimeType: "audio/ogg",
};

describe("Groq transcription", () => {
  it("selects Groq through configuration", () => {
    const env = parseEnv({
      NODE_ENV: "test",
      TEAM_MEMBERS_JSON: "[]",
      TRANSCRIPTION_PROVIDER: "groq",
      GROQ_API_KEY: "test-key",
    });
    expect(createTranscriptionProvider(env)).toBeInstanceOf(
      GroqTranscriptionProvider,
    );
  });

  it("transcribes an in-memory OGG file and preserves metadata", async () => {
    let received: File | undefined;
    const client: GroqTranscriptionClient = {
      create: async (input) => {
        received = input.file;
        return { text: "  clear transcript  " };
      },
    };
    const provider = new GroqTranscriptionProvider(
      "whisper-large-v3-turbo",
      "test-key",
      client,
      1,
    );
    await expect(provider.transcribe(audio)).resolves.toEqual({
      text: "clear transcript",
      provider: "groq",
      model: "whisper-large-v3-turbo",
    });
    expect(received?.name).toBe("telegram-voice.ogg");
    expect(received?.type).toBe("audio/ogg");
  });

  it("rejects an empty transcription", async () => {
    const client: GroqTranscriptionClient = {
      create: async () => ({ text: " " }),
    };
    const provider = new GroqTranscriptionProvider(
      "whisper-large-v3-turbo",
      "test-key",
      client,
      1,
    );
    await expect(provider.transcribe(audio)).rejects.toMatchObject({
      code: "groq_empty_transcription",
    });
  });

  it("wraps a Groq API failure without exposing credentials", async () => {
    const client: GroqTranscriptionClient = {
      create: async () => {
        throw new Error("upstream unavailable");
      },
    };
    const provider = new GroqTranscriptionProvider(
      "whisper-large-v3-turbo",
      "test-key",
      client,
      1,
    );
    await expect(provider.transcribe(audio)).rejects.toMatchObject({
      code: "groq_transcription_failed",
      message: "upstream unavailable",
    });
  });

  it("retries after a timeout and remains bounded", async () => {
    let calls = 0;
    const client: GroqTranscriptionClient = {
      create: async () => {
        calls += 1;
        if (calls === 1) return await new Promise(() => undefined);
        return { text: "retry succeeded" };
      },
    };
    const provider = new GroqTranscriptionProvider(
      "whisper-large-v3-turbo",
      "test-key",
      client,
      2,
      5,
    );
    await expect(provider.transcribe(audio)).resolves.toMatchObject({
      text: "retry succeeded",
    });
    expect(calls).toBe(2);
  });

  it("keeps OpenAI transcription available", async () => {
    const client = {
      audio: {
        transcriptions: {
          create: async () => ({ text: "OpenAI transcript" }),
        },
      },
    } as unknown as OpenAI;
    const provider = new OpenAITranscriptionProvider(
      "gpt-4o-mini-transcribe",
      "test-key",
      client,
    );
    await expect(provider.transcribe(audio)).resolves.toMatchObject({
      text: "OpenAI transcript",
      provider: "openai",
    });
  });
});
