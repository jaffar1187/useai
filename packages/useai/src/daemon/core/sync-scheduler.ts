import { getConfig, saveConfig, addSyncLogEntry } from "@devness/useai-storage";
import { syncPrompts } from "@devness/useai-cloud";

const MIN_INTERVAL_MS = 5 * 60 * 1000; // floor: 5 minutes

let schedulerHandle: NodeJS.Timeout | null = null;

async function runSync(): Promise<void> {
  let config;
  try {
    config = await getConfig();
  } catch {
    return;
  }

  if (!config.sync.autoSync) return;

  const token = config.auth.token;
  if (!token) return;

  try {
    const result = await syncPrompts(token, config, 30);
    if (result.synced > 0) {
      await saveConfig({ ...config, lastSyncAt: new Date().toISOString() });
    }
    if (result.synced > 0 || result.errors > 0) {
      const ok = result.errors === 0;
      addSyncLogEntry({
        event: "auto_sync",
        status: ok ? "success" : "error",
        message: ok
          ? `Auto-synced ${result.synced} prompts`
          : `Auto-sync completed with ${result.errors} errors`,
        details: {
          synced: result.synced,
          skipped: result.skipped,
          errors: result.errors,
        },
      });
      console.log(`[useai sync] Synced ${result.synced} prompts (skipped: ${result.skipped}, errors: ${result.errors})`);
    }
  } catch (err) {
    addSyncLogEntry({
      event: "auto_sync",
      status: "error",
      message: `Auto-sync failed: ${String(err)}`,
    });
    console.error("[useai sync] Sync failed:", err);
  }
}

/**
 * Start the background sync scheduler.
 * Reads `config.sync.intervalMinutes` on each tick so config changes take effect
 * without restarting the daemon.
 *
 * Returns a stop function.
 */
export function startSyncScheduler(): () => void {
  if (schedulerHandle) return () => stopSyncScheduler();

  // Run once shortly after startup, then on interval
  const startupDelay = setTimeout(() => {
    runSync().catch(() => {});
    scheduleNext();
  }, 30_000); // 30s after daemon start

  let nextHandle: NodeJS.Timeout | null = null;

  function scheduleNext(): void {
    getConfig()
      .then((config) => {
        const intervalMs = Math.max(
          config.sync.intervalMinutes * 60_000,
          MIN_INTERVAL_MS,
        );
        nextHandle = setTimeout(() => {
          runSync().catch(() => {});
          scheduleNext();
        }, intervalMs);
        schedulerHandle = nextHandle;
      })
      .catch(() => {
        // Default to 30min if config unreadable
        nextHandle = setTimeout(() => {
          runSync().catch(() => {});
          scheduleNext();
        }, 30 * 60_000);
        schedulerHandle = nextHandle;
      });
  }

  return () => {
    clearTimeout(startupDelay);
    if (nextHandle) clearTimeout(nextHandle);
    schedulerHandle = null;
  };
}

export function stopSyncScheduler(): void {
  if (schedulerHandle) {
    clearTimeout(schedulerHandle);
    schedulerHandle = null;
  }
}
