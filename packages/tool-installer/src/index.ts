export {
  installTool,
  removeTool,
  listInstalledTools,
  isToolConfigured,
  detectInstalledTools,
} from "./installer.js";
export type { ToolInstallResult } from "./installer.js";

export { getToolConfig, getAllToolConfigs } from "./configs.js";
export type { ToolConfig } from "./configs.js";

export { readConfig, writeConfig } from "./formats.js";
export type { ConfigFormat } from "./formats.js";

export { injectInstructions, removeInstructions, INSTRUCTIONS_TEXT } from "./instructions.js";

export { removeClaudeCodeHooks, isClaudeCodeHooksInstalled } from "./hooks.js";

export { matchToolId, matchToolIds } from "./tool-matcher.js";
