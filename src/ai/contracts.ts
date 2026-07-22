import type { DigestInput, ProjectDigest } from "@/schemas/digest";
import type { ProjectUpdate } from "@/schemas/project-update";

export type TranscriptionInput = {
  data: Uint8Array;
  filename: string;
  mimeType: string;
};
export type Transcript = { text: string; provider: string; model: string };
export type ExtractionInput = {
  text: string;
  sourceMessageId: string;
  submittedBy: string;
  currentDate: string;
  timezone: string;
};
export interface TranscriptionProvider {
  transcribe(input: TranscriptionInput): Promise<Transcript>;
}
export interface ExtractionProvider {
  extract(input: ExtractionInput): Promise<ProjectUpdate>;
}
export interface DigestProvider {
  generateDigest(input: DigestInput): Promise<ProjectDigest>;
}
