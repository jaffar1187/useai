import type { UseaiConfig } from "@devness/useai-types";
import { UseaiConfigSchema } from "@devness/useai-types/config";
import { CONFIG_FILE } from "./paths.js";
import { readJson, writeJson } from "./fs.js";

export async function getConfig(): Promise<UseaiConfig> {
  const raw = await readJson<Record<string, unknown>>(CONFIG_FILE);
  return UseaiConfigSchema.parse(raw ?? {});
}

export async function saveConfig(config: UseaiConfig): Promise<void> {
  await writeJson(CONFIG_FILE, config);
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const tv = target[key];
    const sv = source[key];
    if (tv && sv && typeof tv === "object" && typeof sv === "object" && !Array.isArray(tv) && !Array.isArray(sv)) {
      result[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      result[key] = sv;
    }
  }
  return result;
}

export async function patchConfig(
  patch: Partial<UseaiConfig>,
): Promise<UseaiConfig> {
  const current = await getConfig();
  const merged = deepMerge(current, patch);
  const validated = UseaiConfigSchema.parse(merged);
  await saveConfig(validated);
  return validated;
}
