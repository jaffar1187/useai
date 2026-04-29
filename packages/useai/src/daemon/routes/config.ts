import { Hono } from "hono";
import { getConfig, saveConfig } from "@devness/useai-storage";

export const configRoutes = new Hono();

// GET /api/local/config — LocalConfig shape expected by the dashboard
configRoutes.get("/", async (c) => {
  const config = await getConfig();
  return c.json({
    mode: "local",
    authenticated: Boolean(config.auth.token),
    email: config.auth.user?.email ?? null,
    username: config.auth.user?.username ?? null,
    lastSyncAt: config.lastSyncAt ?? null,
    autoSync: config.sync.autoSync,
  });
});

// GET /api/local/config/full — dashboard-shaped config
configRoutes.get("/full", async (c) => {
  const config = await getConfig();

  return c.json({
    mode: "local" as const,
    authenticated: Boolean(config.auth.token),
    email: config.auth.user?.email ?? null,
    capture: {
      prompt: config.capture.prompt,
      promptImages: config.capture.promptImages,
    },
    sync: {
      leaderboardStats: config.sync.leaderboardStats,
      evaluationReasons: config.sync.evaluationReasons,
      autoSync: config.sync.autoSync,
      ...(config.sync.autoSync && { intervalHours: config.sync.intervalMinutes / 60 }),
    },
  });
});

// PATCH /api/local/config — dashboard sends full state, translate to v3 and save
configRoutes.patch("/", async (c) => {
  const body = (await c.req.json()) as Record<string, unknown>;
  const current = await getConfig();
  const capture = body["capture"] as Record<string, unknown> | undefined;
  const sync = body["sync"] as Record<string, unknown> | undefined;

  // 1. Local Only — Prompts, Prompt images
  if (capture) {
    current.capture = {
      prompt: capture["prompt"] === true,
      promptImages: capture["promptImages"] === true,
    };
  }

  // 2. Sync Config — Leaderboard, Evaluation scores, Milestones, Private details, Eval reasons
  // 3. Evaluation — Framework
  // 4. Auto Sync — toggle + interval
  if (sync) {
    const autoSync = sync["autoSync"] === true;
    current.sync = {
      ...current.sync,
      leaderboardStats: sync["leaderboardStats"] === true,
      evaluationReasons: (sync["evaluationReasons"] as "none" | "belowPerfect" | "all") ?? "none",
      autoSync,
      ...(autoSync && typeof sync["intervalHours"] === "number" && {
        intervalMinutes: (sync["intervalHours"] as number) * 60,
      }),
    };
  }

  await saveConfig(current);

  return c.json({
    mode: "local" as const,
    authenticated: Boolean(current.auth.token),
    email: current.auth.user?.email ?? null,
    capture: {
      prompt: current.capture.prompt,
      promptImages: current.capture.promptImages,
    },
    sync: {
      leaderboardStats: current.sync.leaderboardStats,
      evaluationReasons: current.sync.evaluationReasons,
      autoSync: current.sync.autoSync,
      ...(current.sync.autoSync && { intervalHours: current.sync.intervalMinutes / 60 }),
    },
    instructionsUpdated: [] as string[],
  });
});
