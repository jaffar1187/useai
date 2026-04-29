import { Hono } from "hono";
import { getConnectionCount } from "./mcp.js";

const startTime = Date.now();

export const healthRoutes = new Hono();

healthRoutes.get("/health", (c) => {
  const connections = getConnectionCount();
  // Return dashboard-compatible HealthInfo shape
  return c.json({
    status: "ok" as const,
    version: "0.1.0",
    active_sessions: connections,
    mcp_connections: connections,
    uptime_seconds: Math.round((Date.now() - startTime) / 1000),
  });
});
