import type { Command } from "commander";
import { checkForUpdate, runUpdate } from "../services/update.service.js";
import { header, success, info, dim, label } from "../utils/display.js";
import { createInterface } from "node:readline";
import pc from "picocolors";

export function registerUpdate(program: Command): void {
  program
    .command("update")
    .description("Update useai to the latest version")
    .option("-y, --yes", "Install without confirmation")
    .action(async (opts: { yes?: boolean }) => {
      header("Update");

      const stop = (() => {
        process.stdout.write("  Checking for updates…");
        return () => { process.stdout.write("\r\x1b[K"); };
      })();

      const { current, latest, hasUpdate } = checkForUpdate();
      stop();

      label("Current", current);
      label("Latest",  latest);

      if (!hasUpdate) {
        success("Already up to date.");
        console.log();
        return;
      }

      info(`New version available: ${pc.green(latest)}`);
      console.log();

      if (!opts.yes) {
        const answer = await prompt(`  Install ${latest}? (Y/n) `);
        if (answer.toLowerCase() === "n") {
          dim("Cancelled.");
          console.log();
          return;
        }
        console.log();
      }

      info("Running update…");
      runUpdate();
    });
}

function prompt(q: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (ans) => { rl.close(); resolve(ans.trim()); });
  });
}
