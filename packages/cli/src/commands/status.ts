import type { Command } from "commander";
import { getDaemonStatus } from "../services/daemon.service.js";
import { getConfig } from "@devness/useai-storage";
import { header, label, formatDuration, success, fail } from "../utils/display.js";
import pc from "picocolors";

export function registerStatus(program: Command): void {
  program
    .command("status")
    .description("Show daemon and config status")
    .action(async () => {
      header("Status");

      const [daemonStatus, config] = await Promise.all([
        getDaemonStatus(),
        getConfig().catch(() => null),
      ]);

      // Daemon
      if (daemonStatus.running) {
        success(`Daemon running at ${daemonStatus.url}`);
        if (daemonStatus.uptimeSeconds !== undefined)
          label("  uptime",    formatDuration(daemonStatus.uptimeSeconds * 1000));
        if (daemonStatus.activeSessions !== undefined)
          label("  connections", String(daemonStatus.activeSessions));
        if (daemonStatus.version)
          label("  version",  daemonStatus.version);
      } else {
        fail(`Daemon not running  (${daemonStatus.url})`);
      }

      // Config
      console.log();
      if (config) {
        label("Eval framework",  config.evaluation.framework);

        const user = config.auth.user;
        if (user) {
          label("Auth", pc.green(`${user.username ?? user.email} (${user.id.slice(0, 8)}…)`));
          label("Auto-sync", String(config.sync.autoSync));
          if (config.lastSyncAt)
            label("Last sync", config.lastSyncAt.slice(0, 19).replace("T", " "));
        } else {
          label("Auth", pc.dim("not logged in"));
        }
      } else {
        label("Config", pc.dim("not found"));
      }

      console.log();
    });
}
