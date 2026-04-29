import { serve } from "@hono/node-server";
import { createApp } from "./core/router.js";
import { ensureDir } from "@devness/useai-storage";
import {
  DATA_DIR,
  DAEMON_PORT,
  DAEMON_HOST,
} from "@devness/useai-storage/paths";
// import { startSyncScheduler } from "./sync-scheduler.js";

export async function startDaemon(): Promise<void> {
  await ensureDir(DATA_DIR);

  const app = createApp();

  // Start background sync scheduler
  // startSyncScheduler();

  serve(
    { fetch: app.fetch, port: DAEMON_PORT, hostname: DAEMON_HOST },
    (info) => {
      console.log(`useai daemon running at ${info.address}:${info.port}`);
      console.log(`MCP endpoint: ${info.address}:${info.port}/mcp`);
      console.log(`Dashboard API: ${info.address}:${info.port}/api/local/`);
    },
  );
}

// Run directly
startDaemon();
