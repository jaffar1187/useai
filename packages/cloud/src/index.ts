export { apiFetch, API_URL } from "./api-client.js";
export type { CloudResponse, RequestOptions } from "./api-client.js";

export {
  sendOtp,
  verifyOtp,
  checkUsername,
  claimUsername,
  CloudAuthError,
} from "./auth.js";

export { syncPrompts } from "./sync.js";

export { fetchLeaderboard } from "./leaderboard.js";
export type { FetchLeaderboardOptions } from "./leaderboard.js";

export type { SanitizedSession, SyncPayload, SyncResult } from "./types.js";
