# CLAUDE.md — useai v3

## Project

This is useai v3 — a modular monorepo for tracking AI coding sessions via MCP.

## Structure

```
packages/
  types/          → Pure types + zod schemas (zero deps)
  crypto/         → Ed25519 chain, keystore, verification
  storage/        → All filesystem I/O (sessions, config, paths)
  scoring/        → APS + SPACE + Raw evaluation frameworks
  cloud/          → Auth, sync, leaderboard API client
  mcp-server/     → 3 MCP tools (start/heartbeat/end) + session nesting
  daemon/         → Hono HTTP server, REST API routes, autostart, sync scheduler
  dashboard/      → React 19 + Zustand + Tailwind SPA
  tool-installer/ → Install/remove MCP config for 20+ AI tools
  cli/            → Full CLI (Commander.js) — login, export, serve, purge, daemon, update, mcp setup
```

## Dependency order

types → crypto, scoring → storage → cloud → tool-installer → mcp-server → daemon → cli
types → dashboard (standalone SPA, talks to daemon via HTTP)

## Tech stack

- TypeScript 5.7 (strict), ESM only
- pnpm workspaces + Turborepo
- Hono (daemon HTTP server)
- React 19 + Vite 6 + Tailwind v3 (dashboard)
- Zustand v5 (state management)
- Zod (validation)
- MCP SDK (@modelcontextprotocol/sdk)
- Ed25519 + SHA-256 (tamper-evident chain)
- @clack/prompts (CLI interactive UI)

## Commands

- `pnpm build` — build all packages
- `pnpm dev` — dev mode (all packages)
- `pnpm test` — run tests
- Dashboard dev: `cd packages/dashboard && pnpm dev` (port 5173, proxies to daemon on 19200)
- Daemon dev: `cd packages/daemon && pnpm dev`

## Rules

### Git commits

- Do NOT add "Co-Authored-By" lines to commit messages. Ever.
- Write detailed commit messages in simple, plain English. Explain what changed and why in a way anyone can understand. Avoid jargon.
- Use a short title line, then a blank line, then bullet points explaining the changes.
- Always push to origin after committing.

### TypeScript

- Never modify tsconfig settings (strict, exactOptionalPropertyTypes, etc.) just to fix a type error — fix the code instead.

### Modularity

- Each file has one clear responsibility. If a file mixes concerns (e.g. data store + HTTP route + business logic), split it.
- Prefer small, focused files over large files that do multiple things.

### Code style

- ESM imports only (use .js extensions in import paths)
- Each package has one responsibility — if you can't describe it in one sentence, it's too big
- No barrel re-exports between packages — import from the specific subpath (e.g. `@devness/useai-storage/paths` not `@devness/useai-storage`)
- Prefer pure functions over classes where possible
- No unnecessary abstractions — three similar lines > premature helper

### Data paths

- All user data lives in `~/.useai/`
- Sessions: `~/.useai/data/YYYY-MM-DD.jsonl` (one file per day)
- Config: `~/.useai/config.json`
- Keystore: `~/.useai/keystore.json`
- PID file: `~/.useai/daemon.pid`
- Logs: `~/.useai/daemon.log`
- Daemon port: 19200

# Adding AI tool instructions

- Add it to instructions.ts file, not directly to the tool file.
