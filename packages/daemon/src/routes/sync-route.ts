import { Hono } from "hono";
import { syncPrompts } from "@devness/useai-cloud";
import { getConfig, patchConfig, addSyncLogEntry } from "@devness/useai-storage";

export const syncRouteRoutes = new Hono();

syncRouteRoutes.post("/", async (c) => {
  const config = await getConfig();
  if (!config.auth?.token) {
    return c.json({ ok: false, error: "Not authenticated" }, 401);
  }

  try {
    const result = await syncPrompts(config.auth.token, config);

    if (result.synced > 0) {
      await patchConfig({ lastSyncAt: new Date().toISOString() });
    }

    const ok = result.errors === 0;
    addSyncLogEntry({
      event: "sync",
      status: ok ? "success" : "error",
      message: ok
        ? `Synced ${result.synced} prompts across ${result.dates.length} dates`
        : `Sync completed with ${result.errors} errors`,
      details: {
        synced: result.synced,
        skipped: result.skipped,
        errors: result.errors,
        dates: result.dates,
      },
      payload: {
        method: "POST",
        endpoint: "https://useai.dev/api/sync",
        body: result.payload,
      },
    });
    return c.json({ ok, data: result });
  } catch (err) {
    addSyncLogEntry({
      event: "sync",
      status: "error",
      message: `Sync failed: ${String(err)}`,
    });
    return c.json({ ok: false, error: String(err) }, 500);
  }
});
