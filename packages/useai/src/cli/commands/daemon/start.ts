import type { Command } from "commander";
import { getDaemonStatus, startDaemonProcess } from "../../services/daemon.service.js";
import { success, fail, info } from "../../utils/display.js";

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
        await new Promise((r) => setTimeout(r, 1200));
        const after = await getDaemonStatus();
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
