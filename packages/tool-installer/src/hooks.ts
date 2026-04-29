import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();
const CLAUDE_SETTINGS_PATH = join(HOME, ".claude", "settings.json");

function readSettings(): Record<string, unknown> {
  if (!existsSync(CLAUDE_SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CLAUDE_SETTINGS_PATH, "utf-8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeSettings(settings: Record<string, unknown>): void {
  mkdirSync(join(HOME, ".claude"), { recursive: true });
  writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");
}

export function removeClaudeCodeHooks(): void {
  if (!existsSync(CLAUDE_SETTINGS_PATH)) return;
  try {
    const settings = readSettings();
    const hooks = settings["hooks"] as Record<string, unknown[]> | undefined;
    if (!hooks) return;

    if (hooks["UserPromptSubmit"]) {
      hooks["UserPromptSubmit"] = (hooks["UserPromptSubmit"] as Array<Record<string, unknown>>).filter((g) => {
        const inner = g["hooks"] as Array<Record<string, string>> | undefined;
        return !inner?.some((h) => h["command"]?.includes("prompt-guard"));
      });
      if ((hooks["UserPromptSubmit"] as unknown[]).length === 0) delete hooks["UserPromptSubmit"];
    }

    if (hooks["Stop"]) {
      hooks["Stop"] = (hooks["Stop"] as Array<Record<string, unknown>>).filter((g) => {
        const inner = g["hooks"] as Array<Record<string, string>> | undefined;
        return !inner?.some((h) => h["command"]?.includes("stop-guard"));
      });
      if ((hooks["Stop"] as unknown[]).length === 0) delete hooks["Stop"];
    }

    if (Object.keys(hooks).length === 0) delete settings["hooks"];
    writeSettings(settings);
  } catch { /* ignore */ }
}

export function isClaudeCodeHooksInstalled(): boolean {
  const settings = readSettings();
  const hooks = settings["hooks"] as Record<string, unknown[]> | undefined;
  if (!hooks?.["Stop"]) return false;
  return (hooks["Stop"] as Array<Record<string, unknown>>).some((g) => {
    const inner = g["hooks"] as Array<Record<string, string>> | undefined;
    return inner?.some((h) => h["command"]?.includes("stop-guard"));
  });
}
