import type { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  getAllToolConfigs,
  isToolConfigured,
  removeTool,
  removeClaudeCodeHooks,
  isClaudeCodeHooksInstalled,
} from "@devness/useai-tool-installer";
import {
  uninstallAutostart,
  isAutostartEnabled,
} from "../../daemon/core/autostart.js";

export function registerUninstall(program: Command): void {
  program
    .command("uninstall")
    .description("Remove useai from your AI tools")
    .option("-y, --yes", "Remove from all configured tools without prompts")
    .action(async (opts: { yes?: boolean }) => {
      console.log();
      p.intro(pc.bold("  useai uninstall"));

      const configured = getAllToolConfigs().filter((c) => isToolConfigured(c.id));

      if (configured.length === 0 && !isClaudeCodeHooksInstalled()) {
        p.log.info("useai is not configured in any AI tools.");
        p.outro("");
        return;
      }

      let toRemove = configured.map((c) => c.id);
      if (!opts.yes && configured.length > 0) {
        const choices = configured.map((c) => ({ value: c.id, label: c.name }));
        const result  = await p.multiselect({
          message: "Select tools to remove from",
          options: choices,
          initialValues: toRemove,
        });
        if (p.isCancel(result)) { p.cancel("Cancelled."); return; }
        toRemove = result as string[];
      }

      for (const id of toRemove) {
        const res = await removeTool(id);
        if (res.success) p.log.success(res.message);
        else             p.log.error(res.message);
      }

      if (isClaudeCodeHooksInstalled()) {
        removeClaudeCodeHooks();
        p.log.success("Claude Code hooks removed");
      }

      if (isAutostartEnabled()) {
        try {
          uninstallAutostart();
          p.log.success("Autostart service removed");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          p.log.warn(`Could not remove autostart service: ${msg}`);
        }
      }

      p.outro("Done.");
    });
}
