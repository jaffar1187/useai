import { randomUUID } from "node:crypto";
import type { Command } from "commander";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { INSTRUCTIONS_TEXT } from "@devness/useai-tool-installer";
import { registerTools } from "../../mcp-tools/mcp-tools.js";
import { createPromptContext } from "../../core/prompt-context.js";

declare const __VERSION__: string | undefined;
// Fallback to "dev" (not "latest") so it matches the cli/index.ts sentinel.
// installer.ts uses VERSION === "dev" to switch from `npx -y @devness/useai@…`
// to a direct `node <local cli.js>` command for stdio tools.
const VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev";

async function runStdioMcpServer(): Promise<void> {
  const promptContext = createPromptContext();
  // Stdio MCP has no `mcp-session-id` header (that's HTTP-only), so every
  // session would otherwise land with connectionId="" and the dashboard
  // would treat each as its own conversation. Generating a UUID once per
  // process lifetime gives every `useai_start` in this `useai mcp` run a
  // shared connectionId, so prompts from the same IDE launch (e.g. one
  // OpenCode session) group together — mirroring HTTP transport semantics.
  promptContext.connectionId = randomUUID();
  // We're in a separate process from the daemon. Tag the context so
  // useai_start/heartbeat/end also notify the daemon over HTTP — without
  // that, /health.active_sessions never sees stdio sessions because the
  // daemon's in-memory registry lives in a different process.
  promptContext.isStdio = true;
  const server = new McpServer(
    { name: "useai", version: VERSION },
    { instructions: INSTRUCTIONS_TEXT },
  );
  // Capture the host name (e.g. "opencode") at MCP handshake time so
  // `useai_start` can record the IDE's real identity instead of trusting
  // the LLM-supplied `client` arg, which the model often hallucinates.
  server.server.oninitialized = () => {
    const clientInfo = server.server.getClientVersion();
    if (clientInfo?.name) promptContext.mcpClientName = clientInfo.name;
  };
  registerTools(server, promptContext);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export function registerMcp(program: Command): void {
  // Hidden: spawned by AI tools over stdio, never typed by humans. Surfacing
  // it in --help would just confuse end users so we keep it out of the menu.
  program
    .command("mcp", { hidden: true })
    .description("(internal) Run useai as an MCP stdio server")
    .action(async () => {
      try {
        await runStdioMcpServer();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`useai mcp: ${msg}\n`);
        process.exit(1);
      }
    });
}
