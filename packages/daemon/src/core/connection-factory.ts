import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerTools, createPromptContext } from "@devness/useai";
import { connections } from "./connection-store.js";

export async function createMcpConnection(): Promise<WebStandardStreamableHTTPServerTransport> {
  const promptContext = createPromptContext();
  const server = new McpServer({ name: "useai", version: "0.1.0" });

  registerTools(server, promptContext);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (connectionId) => {
      promptContext.connectionId = connectionId;
      const pingInterval = setInterval(
        () => {
          server.server.ping().catch(() => {
            clearInterval(pingInterval);
            connections.delete(promptContext.connectionId!);
          });
        },
        2 * 60 * 1000,
      );
      connections.set(connectionId, {
        transport,
        mcpServer: server,
        promptContext,
        pingInterval,
      });
    },
    onsessionclosed: (connectionId) => {
      const conn = connections.get(connectionId);
      if (conn) clearInterval(conn.pingInterval);
      connections.delete(connectionId);
    },
  });

  await server.connect(transport);

  return transport;
}
