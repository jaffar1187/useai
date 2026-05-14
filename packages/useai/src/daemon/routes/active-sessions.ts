import { Hono } from "hono";
import {
  listActiveSessions,
  registerActiveSession,
  unregisterActiveSession,
  touchActiveSession,
  hasActiveSession,
} from "../core/active-sessions.js";

export const activeSessionsRoutes = new Hono();

/**
 * GET /api/local/active-sessions
 *
 * Returns the in-memory list of in-flight useai sessions — exactly what
 * `/health.active_sessions` counts. Useful for debugging the discrepancy
 * between `active_sessions` and `mcp_connections` (the latter can be larger
 * when MCP transports stay open without an active session, e.g. idle
 * Cursor windows or worktree subagents that exited before useai_start).
 */
activeSessionsRoutes.get("/", (c) => {
  const now = Date.now();
  const sessions = listActiveSessions().map((s) => ({
    promptId: s.promptId,
    connectionId: s.connectionId,
    client: s.client,
    project: s.project,
    title: s.title,
    startedAt: new Date(s.startedAt).toISOString(),
    lastActivityAt: new Date(s.lastActivityAt).toISOString(),
    idleSeconds: Math.round((now - s.lastActivityAt) / 1000),
    parentPromptId: s.parentPromptId,
    sessionDepth: s.sessionDepth,
  }));
  return c.json({ count: sessions.length, sessions });
});

/**
 * POST /api/local/active-sessions
 *
 * Register an active session originating outside this daemon process —
 * specifically, `useai_start` calls inside a stdio MCP server (a separate
 * Node process). Without this, stdio sessions are invisible to
 * /health.active_sessions and to the auto-updater's idle gate.
 */
activeSessionsRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.promptId !== "string") {
    return c.json({ error: "promptId required" }, 400);
  }
  registerActiveSession({
    promptId: body.promptId,
    connectionId: typeof body.connectionId === "string" ? body.connectionId : "",
    client: typeof body.client === "string" ? body.client : "unknown",
    project: typeof body.project === "string" ? body.project : null,
    title: typeof body.title === "string" ? body.title : null,
    startedAt: typeof body.startedAt === "number" ? body.startedAt : Date.now(),
    parentPromptId:
      typeof body.parentPromptId === "string" ? body.parentPromptId : null,
    sessionDepth: typeof body.sessionDepth === "number" ? body.sessionDepth : 0,
  });
  return c.json({ ok: true });
});

/**
 * DELETE /api/local/active-sessions/:promptId
 *
 * Remove an active session — called by the stdio MCP server when
 * `useai_end` completes so /health.active_sessions decrements immediately
 * instead of waiting for the 12-min stale-session sweeper.
 */
activeSessionsRoutes.delete("/:promptId", (c) => {
  unregisterActiveSession(c.req.param("promptId"));
  return c.json({ ok: true });
});

/**
 * POST /api/local/active-sessions/:promptId/heartbeat
 *
 * Bump lastActivityAt for an active session. Called by stdio's
 * `useai_heartbeat` so the daemon's stale-session sweeper doesn't evict
 * long-running stdio sessions that are still alive. The handler reports
 * `unknown: true` when the session isn't tracked so the caller can choose
 * to re-register (covers daemon-restarted-mid-session).
 */
activeSessionsRoutes.post("/:promptId/heartbeat", (c) => {
  const promptId = c.req.param("promptId");
  if (!hasActiveSession(promptId)) {
    return c.json({ ok: false, unknown: true }, 404);
  }
  touchActiveSession(promptId);
  return c.json({ ok: true });
});
