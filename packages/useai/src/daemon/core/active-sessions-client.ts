import { getDaemonUrl } from "@devness/useai-storage/config";

/**
 * Fire-and-forget HTTP client used by the stdio MCP server (`useai mcp`) to
 * mirror its active-session state into the daemon's in-memory registry, so
 * /health.active_sessions and the auto-updater's idle gate count stdio
 * sessions alongside HTTP ones.
 *
 * The daemon runs in a different Node process from `useai mcp`, so direct
 * function calls into `active-sessions.ts` only mutate the stdio process's
 * local Map. These helpers push the same state across the HTTP boundary.
 *
 * Errors are swallowed: a missing or down daemon must not break a live
 * stdio session. The price of that resilience is `/health` may
 * temporarily under-report; that's strictly better than failing user work.
 */

interface RegisterPayload {
  promptId: string;
  connectionId: string;
  client: string;
  project: string | null;
  title: string | null;
  startedAt: number;
  parentPromptId: string | null;
  sessionDepth: number;
}

async function send(
  method: "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<Response | null> {
  let base: string;
  try {
    base = await getDaemonUrl();
  } catch {
    return null;
  }
  // Keep the call snappy — if the daemon is down, don't make the stdio
  // session wait. 2s is plenty for a localhost roundtrip.
  const init: RequestInit = { method, signal: AbortSignal.timeout(2000) };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  try {
    return await fetch(`${base}${path}`, init);
  } catch {
    return null;
  }
}

export async function notifyDaemonRegister(
  payload: RegisterPayload,
): Promise<void> {
  await send("POST", "/api/local/active-sessions", payload);
}

export async function notifyDaemonUnregister(promptId: string): Promise<void> {
  await send(
    "DELETE",
    `/api/local/active-sessions/${encodeURIComponent(promptId)}`,
  );
}

/**
 * Heartbeat the daemon's record of this session. If the daemon doesn't
 * know about it (404), we re-register with the full payload — this covers
 * the case where the daemon restarted mid-session and lost in-memory state.
 */
export async function notifyDaemonHeartbeat(
  promptId: string,
  reregisterPayload: RegisterPayload,
): Promise<void> {
  const res = await send(
    "POST",
    `/api/local/active-sessions/${encodeURIComponent(promptId)}/heartbeat`,
  );
  if (res?.status === 404) {
    await notifyDaemonRegister(reregisterPayload);
  }
}
