import { createHash, verify as cryptoVerify } from "node:crypto";
import type { Session } from "@devness/useai-types";

export function verifySession(session: Session, publicKey: Buffer): boolean {
  const { hash, signature, ...rest } = session;
  const data = JSON.stringify(rest);
  const expectedHash = createHash("sha256")
    .update(data + session.prevHash)
    .digest("hex");

  if (expectedHash !== hash) return false;

  return cryptoVerify(
    null,
    Buffer.from(hash, "hex"),
    { key: publicKey, format: "der", type: "spki" },
    Buffer.from(signature, "base64"),
  );
}

export function verifySessionChain(
  sessions: Session[],
  publicKey: Buffer,
): { valid: boolean; brokenAt?: number } {
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    if (!session || !verifySession(session, publicKey)) {
      return { valid: false, brokenAt: i };
    }
    const prev = sessions[i - 1];
    if (i > 0 && prev && session.prevHash !== prev.hash) {
      return { valid: false, brokenAt: i };
    }
  }
  return { valid: true };
}
