import type { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  detectInstalledTools,
  isToolConfigured,
  installTool,
  getAllToolConfigs,
} from "@devness/useai-tool-installer";
import { DAEMON_URL } from "@devness/useai-storage/paths";
import { getDaemonStatus, startDaemonProcess } from "../services/daemon.service.js";
import {
  installAutostart,
  getAutostartPlatform,
} from "../../daemon/core/autostart.js";

export async function runSetup(opts: { yes?: boolean } = {}): Promise<void> {
  console.log();
  p.intro(pc.bold("  useai setup"));

  const spin = p.spinner();
  spin.start("Scanning for AI tools…");
  const detected     = detectInstalledTools();
  const configured   = detected.filter((id) => isToolConfigured(id));
  const unconfigured = detected.filter((id) => !isToolConfigured(id));
  spin.stop(`Found ${detected.length} tool${detected.length !== 1 ? "s" : ""}`);

  if (detected.length === 0) {
    p.log.warn("No AI tools detected on this machine.");
    p.outro("");
    return;
  }

  for (const id of configured)   p.log.success(`${getAllToolConfigs().find((c) => c.id === id)?.name ?? id}  (already configured)`);
  for (const id of unconfigured) p.log.info(`${getAllToolConfigs().find((c) => c.id === id)?.name ?? id}`);

  const toInstall = unconfigured.length > 0 ? unconfigured : configured;

  let selected: string[] = toInstall;
  if (!opts.yes && unconfigured.length > 0) {
    const choices = toInstall.map((id) => ({
      value: id,
      label: getAllToolConfigs().find((c) => c.id === id)?.name ?? id,
    }));
    const result = await p.multiselect({
      message: "Select tools to configure",
      options: choices,
      initialValues: toInstall,
    });
    if (p.isCancel(result)) { p.cancel("Cancelled."); return; }
    selected = result as string[];
  }

  let installedCount = 0;
  for (const id of selected) {
    const res = await installTool(id);
    if (res.success) {
      p.log.success(res.message);
      installedCount++;
    } else {
      p.log.error(res.message);
    }
  }

  // Auto-start the daemon so the AI tools we just configured can connect immediately.
  // On macOS/Linux we install the autostart service (launchd / systemd --user)
  // — that registers the daemon so it survives reboots AND starts it right now.
  // On unsupported platforms (e.g. Windows for now) we fall back to a detached
  // spawn that lasts only for the current login.
  if (installedCount > 0) {
    const status = await getDaemonStatus();
    if (status.running) {
      p.log.info(`Daemon already running at ${DAEMON_URL}`);
    } else {
      const platform = getAutostartPlatform();
      let startedViaAutostart = false;
      if (platform) {
        try {
          installAutostart();
          startedViaAutostart = true;
          p.log.success(`Autostart enabled — daemon will start at every login.`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          p.log.warn(`Could not enable autostart: ${msg}. Falling back to a one-shot start.`);
        }
      } else {
        p.log.info(`Autostart is not yet supported on ${process.platform}. Starting a one-shot daemon.`);
      }

      try {
        if (!startedViaAutostart) startDaemonProcess();
        await new Promise((r) => setTimeout(r, 1500));
        const after = await getDaemonStatus();
        if (after.running) {
          p.log.success(`Daemon started at ${DAEMON_URL}`);
        } else {
          p.log.warn(`Daemon didn't respond yet — run \`useai daemon status\` to check.`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        p.log.error(`Failed to start daemon: ${msg}`);
      }
    }
  }

  p.outro(pc.green("  Done! Restart your AI tool and useai will track every session."));
}

export function registerSetup(program: Command): void {
  program
    .command("setup")
    .description("Install useai in your AI tools")
    .option("-y, --yes", "Auto-confirm without prompts")
    .action((opts: { yes?: boolean }) => runSetup(opts));
}
