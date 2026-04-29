import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PromptContext } from "../core/prompt-context.js";
import { registerStartTool } from "./start.js";
import { registerHeartbeatTool } from "./heartbeat.js";
import { registerEndTool } from "./end.js";

export function registerTools(
  server: McpServer,
  promptContext: PromptContext,
): void {
  registerStartTool(server, promptContext);
  registerHeartbeatTool(server, promptContext);
  registerEndTool(server, promptContext);
}
