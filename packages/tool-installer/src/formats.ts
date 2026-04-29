import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type ConfigFormat = "json" | "toml" | "yaml";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function readConfig(
  filePath: string,
  format: ConfigFormat,
): Promise<Record<string, unknown>> {
  if (!existsSync(filePath)) return {};

  const raw = readFileSync(filePath, "utf-8");

  if (format === "json") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (format === "toml") {
    const { parse } = await import("smol-toml");
    try {
      return parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (format === "yaml") {
    const { parse } = await import("yaml");
    try {
      return (parse(raw) as Record<string, unknown>) ?? {};
    } catch {
      return {};
    }
  }

  return {};
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export async function writeConfig(
  filePath: string,
  data: Record<string, unknown>,
  format: ConfigFormat,
): Promise<void> {
  mkdirSync(dirname(filePath), { recursive: true });

  if (format === "json") {
    writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    return;
  }

  if (format === "toml") {
    const { stringify } = await import("smol-toml");
    writeFileSync(filePath, stringify(data), "utf-8");
    return;
  }

  if (format === "yaml") {
    const { stringify } = await import("yaml");
    writeFileSync(filePath, stringify(data), "utf-8");
    return;
  }
}
