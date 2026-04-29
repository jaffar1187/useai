import type { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PromptContext } from "../../core/prompt-context.js";

export interface Connection {
  transport: WebStandardStreamableHTTPServerTransport;
  mcpServer: McpServer;
  promptContext: PromptContext;
  pingInterval: NodeJS.Timeout;
}

// Keyed by connectionId (the MCP transport session ID)
export const connections = new Map<string, Connection>();

export function getConnectionCount(): number {
  return connections.size;
}
