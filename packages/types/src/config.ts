import { z } from "zod";

const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().nullable().optional(),
});

export const UseaiConfigSchema = z.object({
  version: z.number().default(3),

  auth: z
    .object({
      token: z.string().optional(),
      user: AuthUserSchema.optional(),
    })
    .default({}),

  evaluation: z
    .object({
      framework: z.string().default("calibrated"),
    })
    .default({}),

  capture: z
    .object({
      prompt: z.boolean().default(false),
      // e.g. [{ type: "image", description: "Screenshot of dashboard nav tabs" }]
      promptImages: z.boolean().default(false),
    })
    .default({}),

  sync: z
    .object({
      autoSync: z.boolean().default(false),
      intervalMinutes: z.number().default(30),

      // Sync anonymous aggregates (total hours, session counts, streaks, language breakdown)
      leaderboardStats: z.boolean().default(true),
      // Controls whether evaluation reason/ideal text is synced (scores are always synced)
      evaluationReasons: z.enum(["none", "belowPerfect", "all"]).default("none"),
    })
    .default({}),

  lastSyncAt: z.string().optional(),

  daemon: z
    .object({
      port: z.number().default(19200),
    })
    .default({}),
});

export type UseaiConfig = z.infer<typeof UseaiConfigSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
