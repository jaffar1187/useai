#!/usr/bin/env node

import pc from 'picocolors';

export {};

let command = process.argv[2];

// CLI mode: handle explicit setup commands (mcp command or --flags)
if (command === 'mcp' || command?.startsWith('--')) {
  const args = command === 'mcp' ? process.argv.slice(3) : process.argv.slice(2);
  const { runSetup } = await import('./setup.js');
  await runSetup(args);
  process.exit(0);
}

// No command + TTY: if already installed → update, otherwise → first-time setup
if (!command && process.stdin.isTTY) {
  const { AI_TOOLS } = await import('./tools.js');
  const isInstalled = AI_TOOLS.some((t) => {
    try { return t.isConfigured(); } catch { return false; }
  });

  if (isInstalled) {
    command = 'update';
  } else {
    const { runSetup } = await import('./setup.js');
    await runSetup([]);
    process.exit(0);
  }
}

// Update mode: check for new version, remove MCP configs, restart daemon, reinstall configs
if (command === 'update') {
  const p = await import('@clack/prompts');
  const { fetchLatestVersion, fetchDaemonHealth, killDaemon, ensureDaemon, installClaudeCodeHooks, VERSION } =
    await import('@useai/shared');
  const { AI_TOOLS } = await import('./tools.js');

  p.intro(pc.bgCyan(pc.black(' useai update ')));

  const checkSpinner = p.spinner();
  checkSpinner.start('Checking for updates...');

  const latest = await fetchLatestVersion();
  if (!latest) {
    checkSpinner.stop('Could not reach npm registry');
    p.log.error('Failed to check for updates. Please check your network connection.');
    process.exit(1);
  }

  const healthBefore = await fetchDaemonHealth();
  const runningVersion = (healthBefore?.version as string) ?? VERSION;

  if (runningVersion === latest && VERSION === latest) {
    checkSpinner.stop(`Already up to date (v${latest})`);
    p.outro('Nothing to do.');
    process.exit(0);
  }

  checkSpinner.stop(`Update available: v${runningVersion} → v${latest}`);

  // 1. Snapshot which tools are currently configured
  const configuredTools = AI_TOOLS.filter((t) => {
    try { return t.isConfigured(); } catch { return false; }
  });

  // 2. Remove MCP config from all configured tools
  const updateSpinner = p.spinner();
  if (configuredTools.length > 0) {
    updateSpinner.start(`Removing MCP configs from ${configuredTools.length} tools...`);
    for (const tool of configuredTools) {
      try {
        tool.remove();
      } catch {
        // continue — will be reinstalled after update
      }
    }
    updateSpinner.stop(`Removed configs from ${configuredTools.length} tools`);
  }

  // 3. Kill old daemon
  const daemonSpinner = p.spinner();
  daemonSpinner.start('Stopping daemon and clearing cache...');
  await killDaemon();

  // 4. Clear npx cache to force fresh fetch
  const { execSync } = await import('node:child_process');
  try {
    execSync('npm cache clean --force', { stdio: 'ignore', timeout: 15000 });
  } catch {
    // non-fatal — ensureDaemon uses --prefer-online anyway
  }

  // 5. Start updated daemon
  daemonSpinner.message('Starting updated daemon...');
  const daemonOk = await ensureDaemon({ preferOnline: true });

  if (!daemonOk) {
    daemonSpinner.stop('Failed to start updated daemon');
    p.note(
      [
        'Run in foreground to debug:',
        `  npx @devness/useai daemon --port 19200`,
      ].join('\n'),
      'Troubleshooting',
    );
    process.exit(1);
  }

  // 6. Verify new version
  const healthAfter = await fetchDaemonHealth();
  const newVersion = (healthAfter?.version as string) ?? 'unknown';
  daemonSpinner.stop(`Daemon updated: v${runningVersion} → v${newVersion}`);

  // 7. Reinstall MCP configs on the same tools
  if (configuredTools.length > 0) {
    const httpOk: string[] = [];
    const stdioOk: string[] = [];
    const failed: string[] = [];

    for (const tool of configuredTools) {
      try {
        if (tool.supportsUrl) {
          tool.installHttp();
          httpOk.push(tool.name);
        } else {
          tool.install();
          stdioOk.push(tool.name);
        }
      } catch {
        failed.push(tool.name);
      }
    }

    if (httpOk.length > 0) p.log.success(`HTTP (daemon): ${httpOk.join(', ')}`);
    if (stdioOk.length > 0) p.log.success(`stdio: ${stdioOk.join(', ')}`);
    if (failed.length > 0) p.log.error(`Failed: ${failed.join(', ')}`);
  }

  // 8. Reinstall Claude Code hooks
  try {
    const hooksInstalled = installClaudeCodeHooks();
    if (hooksInstalled) {
      p.log.success('Claude Code hooks reinstalled');
    }
  } catch { /* ignore */ }

  const dashboard = `\n  Dashboard → ${pc.cyan('http://127.0.0.1:19200/dashboard')}`;
  p.outro(`UseAI updated to v${newVersion} in ${pc.bold(String(configuredTools.length))} tool${configuredTools.length === 1 ? '' : 's'}.${dashboard}`);
  process.exit(0);
}

// Daemon mode: start HTTP server with StreamableHTTP transport
if (command === 'daemon') {
  const { startDaemon } = await import('./daemon.js');
  const portArg = process.argv.indexOf('--port');
  const port = portArg !== -1 ? parseInt(process.argv[portArg + 1]!, 10) : undefined;
  await startDaemon(port);
  // daemon runs until killed — don't fall through
  await new Promise(() => {}); // block forever
}

// Unknown command guard — prevent falling into stdio mode accidentally
if (command) {
  console.error(`Unknown command: "${command}"`);
  console.error('Available commands: mcp, daemon, update');
  process.exit(1);
}

// ── MCP Server (stdio mode — stdin is piped from an AI tool) ────────────────

const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
const { VERSION, ensureDir } = await import('@useai/shared');
const { SessionState } = await import('./session-state.js');
const { registerTools, installGracefulToolHandler } = await import('./register-tools.js');

const session = new SessionState();
const server = new McpServer({
  name: 'UseAI',
  version: VERSION,
});

registerTools(server, session);
installGracefulToolHandler(server);

async function main() {
  ensureDir();

  try {
    session.initializeKeystore();
  } catch {
    // signingAvailable remains false
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('useai MCP server failed to start:', error);
  process.exit(1);
});
