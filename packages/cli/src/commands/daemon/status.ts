import type { Command } from "commander";
import { getDaemonStatus } from "../../services/daemon.service.js";
import { label, formatDuration, success, fail } from "../../utils/display.js";

export function registerDaemonStatus(daemon: Command): void {
  daemon
    .command("status")
    .description("Show daemon status")
    .action(async () => {
      console.log();
      const status = await getDaemonStatus();
      if (status.running) {
        success(`Running at ${status.url}`);
        if (status.pid)              label("  PID",         String(status.pid));
        if (status.uptimeSeconds !== undefined) label("  Uptime",  formatDuration(status.uptimeSeconds * 1000));
        if (status.activeSessions !== undefined) label("  Connections", String(status.activeSessions));
        if (status.version)          label("  Version",    status.version);
      } else {
        fail(`Not running  (${status.url})`);
      }
      console.log();
    });
}
