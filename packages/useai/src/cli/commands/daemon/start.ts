import type { Command } from "commander";
import {
  getDaemonStatus,
  startDaemonProcess,
  waitForDaemonReady,
} from "../../services/daemon.service.js";
import { success, fail, info, spinner } from "../../utils/display.js";

export function registerDaemonStart(daemon: Command): void {
  daemon
    .command("start")
    .description("Start the daemon")
    .action(async () => {
      const status = await getDaemonStatus();
      if (status.running) {
        info(`Daemon already running at ${status.url}`);
        return;
      }
      try {
        startDaemonProcess();
        const stop = spinner("Waiting for daemon to come online…");
        const after = await waitForDaemonReady(10_000);
        stop();
        if (after.running) {
          success(`Daemon started at ${after.url}`);
        } else {
          fail("Daemon started but health check failed. Check logs: useai daemon logs");
        }
      } catch (err) {
        fail(`Failed to start daemon: ${err}`);
      }
    });
}
