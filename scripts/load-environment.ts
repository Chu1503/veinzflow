import { loadEnvConfig } from "@next/env";
import { resolve } from "node:path";

const repositoryRoot = resolve(__dirname, "..");
let loaded = false;

export function loadEnvironment(): void {
  if (loaded) return;

  loadEnvConfig(repositoryRoot, process.env.NODE_ENV !== "production");
  loaded = true;
}
