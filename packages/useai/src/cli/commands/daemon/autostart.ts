import type { Command } from "commander";
import {
  installAutostart,
  uninstallAutostart,
  isAutostartEnabled,
  getAutostartPlatform,
} from "../../../daemon/core/autostart.js";
import { success, fail, info, dim } from "../../utils/display.js";

export function registerDaemonAutostart(daemon: Command): void {
  const autostart = daemon
    .command("autostart")
    .description("Manage the autostart service that runs the daemon at login");

  autostart
    .command("install")
    .description("Install the autostart service so the daemon survives reboots")
    .action(() => {
      const platform = getAutostartPlatform();
      if (!platform) {
        fail(`Autostart is not supported on ${process.platform}.`);
        return;
      }
      try {
        installAutostart();
        success(`Autostart installed (${platform}). Daemon will start at every login.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        fail(`Failed to install autostart: ${msg}`);
      }
    });

  autostart
    .command("remove")
    .description("Remove the autostart service and stop the daemon")
    .action(() => {
      if (!isAutostartEnabled()) {
        dim("Autostart is not installed.");
        return;
      }
      try {
        uninstallAutostart();
        success("Autostart removed.");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        fail(`Failed to remove autostart: ${msg}`);
      }
    });

  autostart
    .command("status")
    .description("Show whether the autostart service is installed")
    .action(() => {
      const platform = getAutostartPlatform();
      if (!platform) {
        info(`Autostart is not supported on ${process.platform}.`);
        return;
      }
      if (isAutostartEnabled()) {
        success(`Autostart is installed (${platform}).`);
      } else {
        dim(`Autostart is not installed. Run \`useai daemon autostart install\` to enable.`);
      }
    });
}
