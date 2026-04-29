export interface AiTool {
  id: string;
  name: string;
  color: string;
  icon?: string;
  initials: string;
}

/**
 * Registry of supported AI tools.
 * Add new tools here — all other packages read from this list.
 */
export const AI_TOOLS: Record<string, AiTool> = {
  "claude-code": {
    id: "claude-code",
    name: "Claude Code",
    color: "#D97706",
    initials: "CC",
  },
  "claude-desktop": {
    id: "claude-desktop",
    name: "Claude Desktop",
    color: "#D97706",
    initials: "CD",
  },
  cursor: {
    id: "cursor",
    name: "Cursor",
    color: "#8B5CF6",
    initials: "CU",
  },
  windsurf: {
    id: "windsurf",
    name: "Windsurf",
    color: "#06B6D4",
    initials: "WS",
  },
  "vscode-copilot": {
    id: "vscode-copilot",
    name: "VS Code Copilot",
    color: "#2563EB",
    initials: "VS",
  },
  "vscode-insiders": {
    id: "vscode-insiders",
    name: "VS Code Insiders",
    color: "#16A34A",
    initials: "VI",
  },
  "gemini-cli": {
    id: "gemini-cli",
    name: "Gemini CLI",
    color: "#4285F4",
    initials: "GC",
  },
  "copilot-cli": {
    id: "copilot-cli",
    name: "GitHub Copilot CLI",
    color: "#1F2328",
    initials: "GH",
  },
  codex: {
    id: "codex",
    name: "OpenAI Codex CLI",
    color: "#10A37F",
    initials: "OC",
  },
  trae: {
    id: "trae",
    name: "Trae",
    color: "#3B82F6",
    initials: "TR",
  },
  "kilo-code": {
    id: "kilo-code",
    name: "Kilo Code",
    color: "#F59E0B",
    initials: "KC",
  },
  crush: {
    id: "crush",
    name: "Crush",
    color: "#EC4899",
    initials: "CR",
  },
  antigravity: {
    id: "antigravity",
    name: "Antigravity",
    color: "#7C3AED",
    initials: "AG",
  },
  goose: {
    id: "goose",
    name: "Goose",
    color: "#059669",
    initials: "GS",
  },
  aider: {
    id: "aider",
    name: "Aider",
    color: "#DC2626",
    initials: "AI",
  },
  cody: {
    id: "cody",
    name: "Sourcegraph Cody",
    color: "#FF6B35",
    initials: "SC",
  },
  continue: {
    id: "continue",
    name: "Continue",
    color: "#6366F1",
    initials: "CO",
  },
  zed: {
    id: "zed",
    name: "Zed",
    color: "#0F172A",
    initials: "ZD",
  },
  unknown: {
    id: "unknown",
    name: "Unknown",
    color: "#6B7280",
    initials: "??",
  },
};

export function resolveToolId(name: string): string {
  const normalized = name.toLowerCase().trim();
  for (const [id, tool] of Object.entries(AI_TOOLS)) {
    if (
      id === normalized ||
      tool.name.toLowerCase() === normalized
    ) {
      return id;
    }
  }
  return "unknown";
}
