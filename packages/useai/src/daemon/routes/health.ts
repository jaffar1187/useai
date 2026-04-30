import { Hono } from "hono";
import { getConnectionCount } from "./mcp.js";

// Injected by tsup at bundle time from packages/useai/package.json. Falls back
// to "dev" when running via the un-bundled tsc output so the daemon doesn't
// crash during local development.
declare const __VERSION__: string | undefined;
const VERSION =
  typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev";

const startTime = Date.now();

export const healthRoutes = new Hono();

healthRoutes.get("/health", (c) => {
  const connections = getConnectionCount();
  // Return dashboard-compatible HealthInfo shape
  return c.json({
    status: "ok" as const,
    version: VERSION,
    active_sessions: connections,
    mcp_connections: connections,
    uptime_seconds: Math.round((Date.now() - startTime) / 1000),
  });
});
