# Dev Setup

- Switch to project root: Ex: `cd /Desktop/projects/useai-v3`
- `pnpm install`
- Terminal1: `pnpm dev`(Compiles all packages and also does watches for files changes)
- Terminal2: `cd packages/daemon && pnpm start`(Runs the daemon server, and also watches for files changes happened in terminal 1 and restarts the server, Note this exclude dashboard updates, For Dashboard changes you need to rebuild again i.e repeat pnpm dev again.)
- Terminal 3: `node packages/cli/dist/index.js mcp setup --yes`(Installs useai in all detected AI tools)
- Dashboard: `http://localhost:19200/`

# If you wish to remove useai from all tools

`node packages/cli/dist/index.js mcp remove --yes`
