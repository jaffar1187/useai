export type LeaderboardDimension = "score" | "hours" | "streak" | "sessions";

export type LeaderboardWindow = "7d" | "30d" | "all";

export type LeaderboardScope = "global" | "following";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  value: number;
  /** Secondary display value (e.g. hours alongside score) */
  secondaryValue?: number;
}

export interface LeaderboardResponse {
  dimension: LeaderboardDimension;
  window: LeaderboardWindow;
  scope: LeaderboardScope;
  entries: LeaderboardEntry[];
  updatedAt: string;
}
