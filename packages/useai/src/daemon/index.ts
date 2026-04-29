export { createApp } from "./core/router.js";
export { startDaemon } from "./app.js";
export { startSyncScheduler, stopSyncScheduler } from "./core/sync-scheduler.js";
export {
  installAutostart,
  uninstallAutostart,
  isAutostartEnabled,
  getAutostartPlatform,
} from "./core/autostart.js";
export type { AutostartPlatform } from "./core/autostart.js";
