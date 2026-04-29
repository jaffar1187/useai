import type { User, AuthResponse } from "@devness/useai-types";
import { apiFetch } from "./api-client.js";

export class CloudAuthError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "CloudAuthError";
  }
}

/**
 * Send a 6-digit OTP to the given email address.
 */
export async function sendOtp(email: string): Promise<void> {
  const res = await apiFetch("/api/auth/send-otp", {
    method: "POST",
    body: { email },
  });
  if (!res.ok) {
    throw new CloudAuthError(res.error ?? "Failed to send OTP", res.status);
  }
}

/**
 * Verify the OTP code and return an auth token + user.
 */
export async function verifyOtp(
  email: string,
  code: string,
): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>("/api/auth/verify-otp", {
    method: "POST",
    body: { email, code },
  });
  if (!res.ok || !res.data) {
    throw new CloudAuthError(res.error ?? "Invalid OTP", res.status);
  }
  return res.data;
}

/**
 * Check whether a username is available.
 * Returns true if available, false if taken.
 */
export async function checkUsername(
  token: string,
  username: string,
): Promise<boolean> {
  const res = await apiFetch<{ available: boolean }>(
    `/api/users/check-username/${encodeURIComponent(username)}`,
    { token },
  );
  if (!res.ok || !res.data) return false;
  return res.data.available;
}

/**
 * Claim or update the username for the authenticated user.
 */
export async function claimUsername(
  token: string,
  username: string,
): Promise<User> {
  const res = await apiFetch<User>("/api/users/me", {
    method: "PATCH",
    token,
    body: { username },
  });
  if (!res.ok || !res.data) {
    throw new CloudAuthError(
      res.error ?? "Failed to claim username",
      res.status,
    );
  }
  return res.data;
}
