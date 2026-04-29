import type { Command } from "commander";
import { logout } from "../services/auth.service.js";
import { header, success, fail } from "../utils/display.js";

export function registerLogout(program: Command): void {
  program
    .command("logout")
    .description("Log out and clear auth token")
    .action(async () => {
      header("Logout");
      try {
        await logout();
        success("Logged out. Auth token cleared.");
      } catch (err) {
        fail(`Logout failed: ${err}`);
      }
      console.log();
    });
}
