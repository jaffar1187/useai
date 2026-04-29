import type { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  detectInstalledTools,
  isToolConfigured,
  installTool,
  getAllToolConfigs,
} from "@devness/useai-tool-installer";

export function registerMcpSetup(mcp: Command): void {
  mcp
    .command("setup")
    .description("Install useai MCP in AI tools")
    .option("-y, --yes", "Auto-confirm without prompts")
    .action(async (opts: { yes?: boolean }) => {
      console.log();
      p.intro(pc.bold("  useai mcp setup"));

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

      // Show status
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

      for (const id of selected) {
        const res = await installTool(id);
        if (res.success) p.log.success(res.message);
        else             p.log.error(res.message);
      }

      p.outro(pc.green("  Done! Restart your AI tool and useai will track every session."));
    });
}
