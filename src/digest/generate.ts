import type { DigestProvider } from "@/ai/contracts";
import type { DigestInput, ProjectDigest } from "@/schemas/digest";
import { renderDigest } from "./render";

export async function generateDigestWithFallback(
  provider: DigestProvider,
  input: DigestInput,
): Promise<ProjectDigest> {
  try {
    return await provider.generateDigest(input);
  } catch {
    return renderDigest(input);
  }
}
