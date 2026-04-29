import {
  generateKeyPairSync,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";
import { hostname } from "node:os";
import type { Keystore } from "@devness/useai-types";

function deriveEncryptionKey(): Buffer {
  const material = `useai-${hostname()}-${process.env["USER"] ?? "default"}`;
  return createHash("sha256").update(material).digest();
}

export function generateKeystore(): Keystore {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });

  const encKey = deriveEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(privateKey),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    publicKey: publicKey.toString("base64"),
    encryptedPrivateKey: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    createdAt: new Date().toISOString(),
  };
}

export function decryptKeystore(keystore: Keystore): Buffer {
  const encKey = deriveEncryptionKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encKey,
    Buffer.from(keystore.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(keystore.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(keystore.encryptedPrivateKey, "base64")),
    decipher.final(),
  ]);
}
