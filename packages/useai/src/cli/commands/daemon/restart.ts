import type { Command } from "commander";
import { stopDaemonProcess, startDaemonProcess, getDaemonStatus } from "../../services/daemon.service.js";
import { success, fail, info } from "../../utils/display.js";

export function registerDaemonRestart(daemon: Command): void {
  daemon
    .command("restart")
    .description("Restart the daemon")
    .action(async () => {
      info("Stopping daemon…");
      stopDaemonProcess();
      await new Promise((r) => setTimeout(r, 500));

      info("Starting daemon…");
      try {
        startDaemonProcess();
        await new Promise((r) => setTimeout(r, 1200));
        const status = await getDaemonStatus();
        if (status.running) {
          success(`Daemon restarted at ${status.url}`);
        } else {
          fail("Daemon started but health check failed.");
        }
      } catch (err) {
        fail(`Failed to start daemon: ${err}`);
      }
    });
}
