import type { Session, Milestone } from "./session.js";
import type { UseaiConfig } from "./config.js";
import type { User } from "./user.js";

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface StatsResponse {
  totalSessions: number;
  totalDurationMs: number;
  currentStreak: number;
  longestStreak: number;
  averageScore: number;
  sessionsByClient: Record<string, number>;
  sessionsByTaskType: Record<string, number>;
}

export interface SessionsResponse {
  sessions: Session[];
  total: number;
}

export interface MilestonesResponse {
  milestones: Milestone[];
}

export interface ConfigResponse {
  config: UseaiConfig;
}

export interface HealthResponse {
  status: "ok" | "error";
  version: string;
  uptime: number;
  activeSessions: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  changelog?: string;
}
