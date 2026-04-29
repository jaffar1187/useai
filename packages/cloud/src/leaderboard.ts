import type {
  LeaderboardDimension,
  LeaderboardWindow,
  LeaderboardScope,
  LeaderboardResponse,
} from "@devness/useai-types";
import { apiFetch } from "./api-client.js";

export interface FetchLeaderboardOptions {
  token?: string;
  dimension?: LeaderboardDimension;
  window?: LeaderboardWindow;
  scope?: LeaderboardScope;
}

export async function fetchLeaderboard(
  options: FetchLeaderboardOptions = {},
): Promise<LeaderboardResponse | null> {
  const { token, dimension = "score", window = "7d", scope = "global" } =
    options;

  const params = new URLSearchParams({ dimension, window, scope });
  const res = await apiFetch<LeaderboardResponse>(
    `/api/leaderboard?${params.toString()}`,
    token !== undefined ? { token } : {},
  );

  if (!res.ok || !res.data) return null;
  return res.data;
}
