import { getAllToolConfigs } from "./configs.js";

/**
 * Normalize a string for fuzzy matching: lowercase, remove spaces/dashes/underscores.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-_]/g, "");
}

/**
 * Find a tool id from a fuzzy name string.
 * Examples: "claude code" → "claude-code", "vscode" → "vscode-copilot"
 */
export function matchToolId(input: string): string | null {
  const needle = normalize(input);
  const configs = getAllToolConfigs();

  // Exact id match
  for (const config of configs) {
    if (normalize(config.id) === needle) return config.id;
  }

  // Exact name match
  for (const config of configs) {
    if (normalize(config.name) === needle) return config.id;
  }

  // Prefix match on id
  for (const config of configs) {
    if (normalize(config.id).startsWith(needle)) return config.id;
  }

  // Substring match on id or name
  for (const config of configs) {
    if (normalize(config.id).includes(needle) || normalize(config.name).includes(needle)) {
      return config.id;
    }
  }

  return null;
}

/**
 * Match multiple tool names at once. Returns matched ids and unmatched inputs.
 */
export function matchToolIds(inputs: string[]): {
  matched: string[];
  unmatched: string[];
} {
  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const input of inputs) {
    const id = matchToolId(input);
    if (id) {
      matched.push(id);
    } else {
      unmatched.push(input);
    }
  }

  return { matched, unmatched };
}
