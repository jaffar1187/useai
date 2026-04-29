# useai v3 — Migration Plan

Base: `useai-v2` (clean modular architecture)
Source: `useai` v1 (mature features)
Goal: Full-featured v3 combining v2's architecture with v1's feature set
Location: `~/Desktop/projects/useai-v3` (new repo)

## Package Naming

- All packages under `@devness` scope
- Main MCP server: `@devness/useai`
- CLI: `@devness/useai-cli`
- Internal packages: `@devness/useai-types`, `@devness/useai-crypto`, `@devness/useai-storage`,
  `@devness/useai-scoring`, `@devness/useai-daemon`, `@devness/useai-tool-installer`,
  `@devness/useai-cloud`, `@devness/useai-dashboard`

---

## Package Structure (v3 target)

```
packages/
  types/          → @devness/useai-types      — Pure types + zod schemas (+ leaderboard, user, cloud types from v1)
  crypto/         → @devness/useai-crypto     — Ed25519 chain, keystore, verification (unchanged from v2)
  storage/        → @devness/useai-storage    — All filesystem I/O (unchanged from v2)
  scoring/        → @devness/useai-scoring    — APS + SPACE + Raw evaluation frameworks
  mcp-server/     → @devness/useai            — 3 MCP tools + session state + nesting support
  daemon/         → @devness/useai-daemon     — Hono HTTP server, REST API, autostart
  dashboard/      → @devness/useai-dashboard  — React 19 SPA (best of v1 + v2 dashboards)
  tool-installer/ → @devness/useai-tool-installer — Full 20+ AI tool support
  cli/            → @devness/useai-cli        — Full CLI (login, export, serve, purge, daemon, update, setup)
  cloud/          → @devness/useai-cloud      — NEW: auth, sync, leaderboard API client
```

---

## Agent Research Plans

> Each section below is filled in by a dedicated research agent.

---

## A — Tool Installer

### Tools Missing from v2 (to add in v3)
v2 has 9 tools. v1 has 25+. Missing: `antigravity`, `copilot-cli`, `trae`, `kilo-code`, `crush`, `claude-desktop`, `vscode-insiders`, `goose`, and all tools from `@devness/mcp-setup` registry not yet in v2.

### New Files in `packages/tool-installer/src/`
- `registry.ts` — integrate `@devness/mcp-setup` + define extra tools not in registry
- `formats.ts` — TOML/YAML read/write (codex uses TOML, antigravity uses YAML)
- `cli.ts` — interactive setup flow (scan, multi-select, confirm, install)
- `remove-flow.ts` — uninstall workflow (remove configs + hooks + daemon)
- `tool-matcher.ts` — fuzzy name matching (e.g. "claude code" → "claude-code")

### Logic to Adapt
- **Registry**: import from `@devness/mcp-setup`, extend with extra tools, expose unified `AiTool[]`
- **Instruction injection**: keep v2's marker-block approach, add dynamic framework-based text, support TOML/YAML files
- **Config formats**: all tools use HTTP URL in v3 (`{ type: "http", url: "http://127.0.0.1:19200/mcp" }`) — no stdio fallback
- **Tool detection**: filesystem-based primary, `hasBinary()` fallback, manual hints for tools without instruction support

### Breaking Changes & Gotchas
- stdio mode (`npx` command) dropped — v3 is HTTP/daemon-only
- Codex uses TOML → add `smol-toml` dependency
- Antigravity variants use YAML → add `yaml` dependency
- Instruction paths vary per tool — maintain mapping in `configs.ts`
- Registry may update over time — use `useai update` to sync

### Dependencies to Add
`smol-toml`, `yaml`, `@clack/prompts` (lazy-loaded for CLI)

### Complexity: **Medium** (~6–8 hours)

---

## B — Cloud / Auth / Sync / Leaderboard

### New `packages/cloud/` Package (`@devness/useai-cloud`)

**Files:**
- `api-client.ts` — base HTTP client (Bearer token, base URL from `USEAI_API_URL` env)
- `auth.ts` — OTP flow: `sendOtp()`, `verifyOtp()`, username claiming, token storage
- `sync.ts` — session sync: sanitize, deduplicate, group by date, reconcile chain, chunk milestones
- `leaderboard.ts` — fetch by dimension (`score|hours|streak|sessions`) + window (`7d|30d|all`)
- `types.ts` — `SyncPayload`, `PublishPayload`, `UserProfile`, `LeaderboardEntry`

**API Endpoints used:**
- `POST /api/auth/send-otp`, `POST /api/auth/verify-otp`
- `PATCH /api/users/me`, `GET /api/users/check-username/:username`
- `POST /api/sync`, `POST /api/publish`
- `GET /api/leaderboard?dimension=&window=&scope=`

### Type Extensions in `@devness/useai-types`
- Extend config schema: add `auth`, `sync`, `lastSyncAt`, `capture` fields
- New `types/user.ts`: `User`, `PublicProfile`
- New `types/leaderboard.ts`: `LeaderboardDimension`, `LeaderboardWindow`, `LeaderboardEntry`

### Auth Flow
1. Prompt email → `sendOtp()` → prompt 6-digit code (with resend support, 3 retries)
2. `verifyOtp()` → receive `{ token, user }`
3. If no username → `claimUsername()` loop until claimed
4. Save to `~/.useai/config.json`: `auth`, `sync.enabled=true`

### Sync Rules
- Strip `prompt` and `prompt_images` before sending (stay local)
- Filter `evaluation` reasons based on `capture.reasonsLevel` config
- Validate chain hashes before sync (exclude tampered entries)
- Deduplicate by session_id (keep longest duration)
- Group by date, chunk milestones 50/request

### Config Schema Changes (v3 additions)
```json
{
  "version": 3,
  "auth": { "token": "...", "user": { "id": "...", "email": "...", "username": "..." } },
  "sync": { "enabled": true, "autoSync": true, "intervalMinutes": 30 },
  "lastSyncAt": "2026-03-11T...",
  "capture": { "prompt": false, "promptImages": false, "evaluation": true, "milestones": true }
}
```

### Complexity: **Medium–Complex** (~1,200 lines total)

---

## C — CLI Commands

### Package: `@devness/useai-cli`

**All v1 commands (22 subcommands across 8 main commands):**

| Command | What it does | Complexity |
|---|---|---|
| `useai stats` | Show session stats summary | Simple |
| `useai status` | Show daemon + config status | Simple |
| `useai milestones` | List recent milestones | Simple |
| `useai export` | Export sessions to JSON/CSV | Simple |
| `useai purge` | Delete local session data | Simple |
| `useai serve` | Start dashboard in browser | Simple |
| `useai config get/set/reset` | Manage config values | Medium |
| `useai daemon start/stop/restart/status/logs` | Manage daemon process | Medium |
| `useai login` | OTP email auth + username claim | Medium |
| `useai logout` | Clear auth token | Simple |
| `useai mcp setup/remove` | Install/remove MCP from AI tools | Complex |
| `useai update` | Update to latest version | Complex |

### v3 File Structure
```
packages/cli/src/
  commands/
    stats.ts, status.ts, milestones.ts, export.ts, purge.ts, serve.ts
    config.ts, login.ts, logout.ts, update.ts
    daemon/
      start.ts, stop.ts, restart.ts, status.ts, logs.ts
    mcp/
      setup.ts, remove.ts
  services/
    config.service.ts   → wraps @devness/useai-storage
    stats.service.ts    → reads sessions via @devness/useai-storage
    daemon.service.ts   → daemon lifecycle (start/stop/pid)
    autostart.service.ts → launchd/systemd platform helpers
    auth.service.ts     → delegates to @devness/useai-cloud
    update.service.ts   → npm version check + npx re-install
    tools.service.ts    → delegates to @devness/useai-tool-installer
  utils/
    display.ts          → table/color formatting (port from v1)
  index.ts              → CLI entry point (Commander root)
```

### Dependencies
`commander`, `picocolors`, `@clack/prompts`, `@devness/useai-types`, `@devness/useai-storage`, `@devness/useai-tool-installer`, `@devness/useai-cloud`, `@devness/useai-daemon`

### Complexity: **Medium** (~34 hours total, mostly straightforward ports)

---

## D — Session Nesting (mcp-server)

### How v1 Nesting Works
- `SavedParentState` interface: 22-field snapshot of full session state
- `parentStateStack[]`: arbitrary depth stack
- `saveParentState()`: captures state + sets `pausedAt` timestamp before child starts
- `restoreParentState()`: pops parent, accumulates `childPausedMs`
- Parent duration = wall time − `childPausedMs` (child time excluded from parent)
- `getParentSessionIds()`: used to protect parent sessions from orphan sweep

### Changes to `PromptContext` in v3
```typescript
interface SavedPromptContext {
  // all 13 existing PromptContext fields
  childPausedMs: number;
  pausedAt: number;
}

interface PromptContext {
  // ... existing fields ...
  parentStack: SavedPromptContext[];   // NEW
  childPausedMs: number;               // NEW
  sessionDepth: number;                // NEW: 0 = root, 1+ = nested
}
```

### Changes to `useai_start`
- If `ctx.startedAt !== null` (session already active): save current context to `parentStack`, increment `sessionDepth`
- Keep `prevHash` unchanged (chain continuity across parent/child)
- Reset only session-specific fields (promptId, startedAt, idleMs, etc.)
- If `startedAt === null`: normal root session start (reset everything)

### Changes to `useai_end`
- Seal current session normally
- If `parentStack.length > 0`: pop parent, update `childPausedMs += child duration`, restore `prevHash = child's final hash`
- If `parentStack.length === 0`: full cleanup (clear all fields)

### Backward Compatibility
- **Non-breaking for flat sessions** — single start/end workflows unchanged
- Nesting only activates if `useai_start` is called while a session is already active
- v2-era tools will never trigger nesting (they always end before starting a new session)

### Complexity: **Medium** (~2–3 days dev + 1 day testing)

---

## E — Dashboard + UI Components

### Recommendation: Keep single `dashboard` package (no separate `ui`)
All components are domain-specific and tightly coupled to session/milestone models. A separate `ui` package only makes sense for multi-consumer reuse — v3 has only one consumer (the dashboard).

### What to Restore from v1 (missing in v2)
- `ProfileDropdown.tsx` — auth UI, OTP login, username management, sync status
- `SettingsPage.tsx` — capture prefs, evaluation framework, cloud sync config
- `settings` tab in `TabBar.tsx` and `activeTab` type

### v3 Component Structure
All v2 components kept. Add back from v1:
```
components/
  ├── [all 24 existing v2 components]
  ├── ProfileDropdown.tsx   ← RESTORE (~40 LOC)
  └── SettingsPage.tsx      ← RESTORE (~320 LOC)
```

### Store Extensions (`store.ts`)
Add to Zustand store:
```typescript
config: LocalConfig | null       // auth status, capture prefs, eval framework
user: User | null                // logged-in user
updateInfo: UpdateInfo | null    // version check
loadConfig(), loadUser(), loadUpdateCheck()
// auth: login, logout, verifyOtp
// cloud: postSync(), checkUsername(), updateUsername()
```

### API Extensions (`lib/api.ts`)
New methods: `fetchFullConfig()`, `patchConfig()`, `postSendOtp()`, `postVerifyOtp()`, `postLogout()`, `postSync()`, `checkUsername()`, `updateUsername()`, `fetchUpdateCheck()`

### Stats Models
All `stats.ts` logic from v2 already complete — keep as-is. Key preserved: `ComputedStats` (30+ fields), `calculateStreak()`, `groupIntoConversations()`, `groupSessionsWithMilestones()`.

### Incremental Build Order
1. Start with v2 dashboard (auth-free)
2. Add `ProfileDropdown` + basic auth UI
3. Wire store auth methods to API
4. Restore `SettingsPage`
5. End-to-end test cloud sync

### Complexity: **Medium** (~10 hours)

---

## Implementation Order

Build in strict dependency order:

1. `@devness/useai-types` — add user, leaderboard, config extensions
2. `@devness/useai-crypto` — unchanged from v2
3. `@devness/useai-storage` — unchanged from v2
4. `@devness/useai-scoring` — add Raw framework alongside SPACE
5. `@devness/useai-cloud` — new: auth, sync, leaderboard client
6. `@devness/useai-tool-installer` — expand to 20+ tools
7. `@devness/useai` (mcp-server) — add session nesting
8. `@devness/useai-daemon` — add autostart, sync scheduler
9. `@devness/useai-cli` — all commands
10. `@devness/useai-dashboard` — restore auth/settings UI

## Effort Summary

| Package | Complexity | Est. Hours |
|---|---|---|
| types | Simple | 2 |
| cloud | Medium–Complex | 16 |
| tool-installer | Medium | 8 |
| mcp-server (nesting) | Medium | 16 |
| daemon (autostart+sync) | Medium | 8 |
| cli | Medium | 34 |
| dashboard | Medium | 10 |
| **Total** | | **~94 hours** |
