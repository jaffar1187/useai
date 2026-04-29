import { createHash, sign } from "node:crypto";
import type { Session } from "@devness/useai-types";

export function computeHash(data: string, prevHash: string): string {
  return createHash("sha256")
    .update(data + prevHash)
    .digest("hex");
}

export function signHash(hash: string, privateKey: Buffer): string {
  const sig = sign(null, Buffer.from(hash, "hex"), {
    key: privateKey,
    format: "der",
    type: "pkcs8",
  });
  return sig.toString("base64");
}

export function buildSessionRecord(
  session: Omit<Session, "hash" | "signature">,
  privateKey: Buffer,
): { hash: string; signature: string } {
  const data = JSON.stringify(session);
  const hash = computeHash(data, session.prevHash);
  const signature = signHash(hash, privateKey);
  return { hash, signature };
}
