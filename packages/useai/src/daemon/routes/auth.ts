import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { sendOtp, verifyOtp, CloudAuthError } from "@devness/useai-cloud";
import { getConfig, patchConfig, saveConfig, addSyncLogEntry } from "@devness/useai-storage";

function errorResponse(err: unknown): { message: string; status: ContentfulStatusCode } {
  if (err instanceof CloudAuthError) {
    return { message: err.message, status: (err.status ?? 500) as ContentfulStatusCode };
  }
  return { message: err instanceof Error ? err.message : "Unknown error", status: 500 };
}

export const authRoutes = new Hono();

authRoutes.post("/send-otp", async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  try {
    await sendOtp(email);
    return c.json({ ok: true });
  } catch (err) {
    const { message, status } = errorResponse(err);
    return c.json({ ok: false, message }, status);
  }
});

authRoutes.post("/verify-otp", async (c) => {
  const { email, code } = await c.req.json<{ email: string; code: string }>();
  try {
    const result = await verifyOtp(email, code);
    await patchConfig({ auth: { token: result.token, user: result.user } });
    addSyncLogEntry({
      event: "login",
      status: "success",
      message: `Logged in as ${result.user.email}`,
      details: { userId: result.user.id, email: result.user.email },
    });
    return c.json({ ok: true, data: { user: result.user } });
  } catch (err) {
    const { message, status } = errorResponse(err);
    return c.json({ ok: false, message }, status);
  }
});

authRoutes.post("/logout", async (c) => {
  const config = await getConfig();
  config.auth = { token: undefined, user: undefined } as unknown as typeof config.auth;
  await saveConfig(config);
  addSyncLogEntry({
    event: "logout",
    status: "info",
    message: "Logged out",
  });
  return c.json({ ok: true });
});
