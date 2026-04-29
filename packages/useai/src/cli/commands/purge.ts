// import type { Command } from "commander";
// import { header, dim } from "../utils/display.js";

// ⚠️ USE AT YOUR OWN RISK — this command deletes all local session data
// (everything under ~/.useai/data/) and cannot be undone.
//
// The implementation is intentionally commented out as a safeguard.
// To re-enable, uncomment the action body and the prompt helper below.
// export function registerPurge(program: Command): void {
//   program
//     .command("purge")
//     .description("Delete all local session data (disabled — see purge.ts)")
//     .option("-y, --yes", "Skip confirmation prompt")
//     .action(async (_opts: { yes?: boolean }) => {
//       header("Purge");
//       dim("Purge is disabled. Enable it in packages/cli/src/commands/purge.ts if you really need it.");
//       console.log();

// ── DESTRUCTIVE — keep commented out ──────────────────────────────
// if (!_opts.yes) {
//   const answer = await prompt("  This will permanently delete all local session data. Continue? (y/N) ");
//   if (answer.toLowerCase() !== "y") {
//     dim("Cancelled.");
//     console.log();
//     return;
//   }
//   console.log();
// }
//
// try {
//   if (existsSync(DATA_DIR)) {
//     rmSync(DATA_DIR, { recursive: true, force: true });
//     success("Session data deleted.");
//   } else {
//     dim("No session data found.");
//   }
// } catch (err) {
//   fail(`Purge failed: ${err}`);
// }
// console.log();
//     });
// }

// function prompt(q: string): Promise<string> {
//   return new Promise((resolve) => {
//     const rl = createInterface({ input: process.stdin, output: process.stdout });
//     rl.question(q, (ans) => { rl.close(); resolve(ans.trim()); });
//   });
// }
