import { existsSync, readFileSync } from "node:fs";
import { DAEMON_URL } from "@devness/useai-storage/paths";
import { getToolConfig, getAllToolConfigs } from "./configs.js";
import { readConfig, writeConfig } from "./formats.js";
import { injectInstructions, removeInstructions } from "./instructions.js";

export interface ToolInstallResult {
  success: boolean;
  toolId: string;
  message: string;
}

const MCP_ENTRY = {
  type: "http",
  url: `${DAEMON_URL}/mcp`,
} as const;

export async function installTool(toolId: string): Promise<ToolInstallResult> {
  const config = getToolConfig(toolId);
  if (!config) {
    return { success: false, toolId, message: `Unknown tool: ${toolId}` };
  }

  try {
    const existing = await readConfig(config.configPath, config.configFormat);
    const servers = (existing[config.mcpKey] as Record<string, unknown>) ?? {};

    servers["useai"] = MCP_ENTRY;
    existing[config.mcpKey] = servers;

    await writeConfig(config.configPath, existing, config.configFormat);

    if (config.instructionsPath && config.instructionsMethod) {
      injectInstructions(config.instructionsPath, config.instructionsMethod);
    }

    return {
      success: true,
      toolId,
      message: `Installed useai MCP server for ${config.name}`,
    };
  } catch (err) {
    return {
      success: false,
      toolId,
      message: `Failed to install for ${config.name}: ${err}`,
    };
  }
}

export async function removeTool(toolId: string): Promise<ToolInstallResult> {
  const config = getToolConfig(toolId);
  if (!config) {
    return { success: false, toolId, message: `Unknown tool: ${toolId}` };
  }

  if (!existsSync(config.configPath)) {
    return { success: false, toolId, message: `Config not found for ${config.name}` };
  }

  try {
    const existing = await readConfig(config.configPath, config.configFormat);
    const servers = (existing[config.mcpKey] as Record<string, unknown>) ?? {};
    delete servers["useai"];
    existing[config.mcpKey] = servers;

    await writeConfig(config.configPath, existing, config.configFormat);

    if (config.instructionsPath && config.instructionsMethod) {
      removeInstructions(config.instructionsPath, config.instructionsMethod);
    }

    return {
      success: true,
      toolId,
      message: `Removed useai MCP server from ${config.name}`,
    };
  } catch (err) {
    return {
      success: false,
      toolId,
      message: `Failed to remove from ${config.name}: ${err}`,
    };
  }
}

export async function listInstalledTools(): Promise<string[]> {
  const installed: string[] = [];

  for (const config of getAllToolConfigs()) {
    try {
      const existing = await readConfig(config.configPath, config.configFormat);
      const servers = existing[config.mcpKey] as Record<string, unknown> | undefined;
      if (servers?.["useai"]) {
        installed.push(config.id);
      }
    } catch {
      // Not installed
    }
  }

  return installed;
}

export function isToolConfigured(toolId: string): boolean {
  const config = getToolConfig(toolId);
  if (!config || !existsSync(config.configPath)) return false;

  if (config.configFormat !== "json") return false; // sync check only for JSON

  try {
    const raw = readFileSync(config.configPath, "utf-8");
    const existing = JSON.parse(raw) as Record<string, unknown>;
    const servers = existing[config.mcpKey] as Record<string, unknown> | undefined;
    return !!servers?.["useai"];
  } catch {
    return false;
  }
}

export function detectInstalledTools(): string[] {
  return getAllToolConfigs()
    .filter((c) => c.detect())
    .map((c) => c.id);
}
