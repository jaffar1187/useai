import type { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { sendOtp, login, checkUsername, claimUsername } from "../services/auth.service.js";

export function registerLogin(program: Command): void {
  program
    .command("login")
    .description("Log in with email OTP")
    .action(async () => {
      console.log();
      p.intro(pc.bold("  useai login"));

      const email = await p.text({
        message: "Email address",
        validate: (v) => (v.includes("@") ? undefined : "Enter a valid email"),
      });
      if (p.isCancel(email)) { p.cancel("Cancelled."); return; }

      const sendSpinner = p.spinner();
      sendSpinner.start("Sending OTP…");
      try {
        await sendOtp(email);
        sendSpinner.stop("Code sent — check your inbox.");
      } catch (err) {
        sendSpinner.stop(pc.red(`Failed to send OTP: ${err}`));
        return;
      }

      let auth;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const code = await p.text({
          message: `6-digit code (attempt ${attempt}/3)`,
          validate: (v) => (/^\d{6}$/.test(v) ? undefined : "Enter a 6-digit code"),
        });
        if (p.isCancel(code)) { p.cancel("Cancelled."); return; }

        try {
          auth = await login(email, code);
          break;
        } catch {
          if (attempt < 3) {
            p.log.warn("Invalid code. Try again.");
          } else {
            p.log.error("Too many attempts. Run `useai login` again.");
            p.outro("");
            return;
          }
        }
      }
      if (!auth) return;

      // Claim username if not set
      if (!auth.user.username) {
        p.log.info("Choose a username for your public profile.");
        let claimed = false;
        while (!claimed) {
          const username = await p.text({
            message: "Username (letters, numbers, dashes)",
            validate: (v) => (/^[a-z0-9-]{3,32}$/.test(v) ? undefined : "3–32 chars, a-z 0-9 dashes"),
          });
          if (p.isCancel(username)) break;

          const available = await checkUsername(auth.token, username).catch(() => false);
          if (!available) {
            p.log.warn("Username taken. Try another.");
            continue;
          }

          try {
            await claimUsername(auth.token, username);
            claimed = true;
          } catch {
            p.log.warn("Could not claim username. Try another.");
          }
        }
      }

      p.outro(pc.green(`  Logged in as ${auth.user.username ?? auth.user.email}`));
    });
}
