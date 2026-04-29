import type { Command } from "commander";
import { getConfig, patchConfig, saveConfig } from "@devness/useai-storage";
import { UseaiConfigSchema } from "@devness/useai-types/config";
import { header, success, fail, label, dim } from "../utils/display.js";

export function registerConfig(program: Command): void {
  const config = program
    .command("config")
    .description("Manage configuration");

  config
    .command("get [key]")
    .description("Get config value(s)")
    .action(async (key?: string) => {
      header("Config");
      const cfg = await getConfig();
      if (key) {
        const parts = key.split(".");
        let val: unknown = cfg;
        for (const part of parts) {
          val = (val as Record<string, unknown>)[part];
        }
        label(key, JSON.stringify(val));
      } else {
        printConfig(cfg, "");
      }
      console.log();
    });

  config
    .command("set <key> <value>")
    .description("Set a config value (dot-notation key)")
    .action(async (key: string, value: string) => {
      try {
        const patch = buildPatch(key, parseValue(value));
        await patchConfig(patch);
        success(`Set ${key} = ${value}`);
      } catch (err) {
        fail(`Failed to set config: ${err}`);
      }
      console.log();
    });

  config
    .command("reset")
    .description("Reset config to defaults")
    .action(async () => {
      const defaults = UseaiConfigSchema.parse({});
      await saveConfig(defaults);
      success("Config reset to defaults.");
      console.log();
    });
}

function printConfig(obj: unknown, prefix: string): void {
  if (typeof obj !== "object" || obj === null) {
    label(prefix, JSON.stringify(obj));
    return;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) {
      printConfig(v, fullKey);
    } else {
      label(fullKey, JSON.stringify(v) ?? dim("null"));
    }
  }
}

function parseValue(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (!isNaN(Number(raw))) return Number(raw);
  return raw;
}

function buildPatch(key: string, value: unknown): Record<string, unknown> {
  const parts = key.split(".");
  const result: Record<string, unknown> = {};
  let cur = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    cur[part] = {};
    cur = cur[part] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
  return result;
}
