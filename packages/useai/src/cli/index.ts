import { Command } from "commander";

import { startDaemon } from "../daemon/app.js";

import { registerSetup, runSetup } from "./commands/setup.js";
import { registerUninstall }       from "./commands/uninstall.js";
import { registerMcp }              from "./commands/mcp.js";

import { registerStats }      from "./commands/stats.js";
import { registerStatus }     from "./commands/status.js";
import { registerExport }     from "./commands/export.js";
import { registerServe }      from "./commands/serve.js";
import { registerConfig }     from "./commands/config.js";
import { registerLogin }      from "./commands/login.js";
import { registerLogout }     from "./commands/logout.js";
import { registerSync }       from "./commands/sync.js";
import { registerUpdate }     from "./commands/update.js";

import { registerDaemonStart }   from "./commands/daemon/start.js";
import { registerDaemonStop }    from "./commands/daemon/stop.js";
import { registerDaemonRestart } from "./commands/daemon/restart.js";
import { registerDaemonStatus }  from "./commands/daemon/status.js";
import { registerDaemonLogs }    from "./commands/daemon/logs.js";

const program = new Command();

program
  .name("useai")
  .description("Track and improve your AI coding sessions")
  .version("1.0.1");

// useai (no args) → run setup wizard
program.action(async () => {
  await runSetup({});
});

// Top-level commands
registerSetup(program);
registerUninstall(program);
registerMcp(program);
registerServe(program);
registerStats(program);
registerStatus(program);
registerExport(program);
registerConfig(program);
registerLogin(program);
registerLogout(program);
registerSync(program);
registerUpdate(program);

// useai daemon <subcommand>
const daemon = program
  .command("daemon")
  .description("Manage the useai daemon");

registerDaemonStart(daemon);
registerDaemonStop(daemon);
registerDaemonRestart(daemon);
registerDaemonStatus(daemon);
registerDaemonLogs(daemon);

// Hidden: useai daemon-run starts the HTTP server in-process. Used internally
// by `useai daemon start` to spawn a detached background daemon — not for
// direct user invocation.
program
  .command("daemon-run", { hidden: true })
  .description("(internal) Run the daemon HTTP server in-process")
  .action(async () => {
    await startDaemon();
  });

program.parseAsync().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`useai: ${msg}\n`);
  process.exit(1);
});
