import { Hono } from "hono";
import { checkUsername, claimUsername } from "@devness/useai-cloud";
import { getConfig, patchConfig } from "@devness/useai-storage";

export const usersRoutes = new Hono();

// GET /api/local/users/check-username/:username
usersRoutes.get("/check-username/:username", async (c) => {
  const config = await getConfig();
  const token = config.auth?.token;
  if (!token) {
    return c.json({ available: false, reason: "Not authenticated" });
  }
  try {
    const username = c.req.param("username");
    const available = await checkUsername(token, username);
    return c.json({ available });
  } catch (err) {
    return c.json({ available: false, reason: (err as Error).message });
  }
});

// PATCH /api/local/users/me
usersRoutes.patch("/me", async (c) => {
  const config = await getConfig();
  const token = config.auth?.token;
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  try {
    const body = await c.req.json() as { username?: string };
    if (!body.username) {
      return c.json({ error: "Username required" }, 400);
    }
    const user = await claimUsername(token, body.username);
    // Update local config with new username
    await patchConfig({
      auth: {
        ...config.auth,
        user: {
          ...config.auth.user!,
          username: user.username,
        },
      },
    });
    return c.json({ username: user.username });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});
