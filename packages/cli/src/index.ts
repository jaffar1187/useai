#!/usr/bin/env node
import { Command } from "commander";

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

import { registerMcpSetup }  from "./commands/mcp/setup.js";
import { registerMcpRemove } from "./commands/mcp/remove.js";

const program = new Command();

program
  .name("useai")
  .description("Track and improve your AI coding sessions")
  .version("0.1.0");

// Top-level commands
registerStats(program);
registerStatus(program);
registerExport(program);
registerServe(program);
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

// useai mcp <subcommand>
const mcp = program
  .command("mcp")
  .description("Manage MCP installation in AI tools");

registerMcpSetup(mcp);
registerMcpRemove(mcp);

program.parse();
