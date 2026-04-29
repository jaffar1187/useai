import type { Keystore } from "@devness/useai-types";
import { generateKeystore, decryptKeystore } from "@devness/useai-crypto";
import { KEYSTORE_FILE } from "./paths.js";
import { readJson, writeJson } from "./fs.js";

export async function getOrCreateKeystore(): Promise<{
  keystore: Keystore;
  privateKey: Buffer;
}> {
  const raw = await readJson<Record<string, unknown>>(KEYSTORE_FILE);

  // Detect v2 or malformed keystore by checking for required v3 camelCase fields.
  // If missing, discard and generate a fresh v3 keystore.
  const isV3 =
    raw !== null &&
    typeof raw["authTag"] === "string" &&
    typeof raw["encryptedPrivateKey"] === "string" &&
    typeof raw["publicKey"] === "string";

  let keystore: Keystore;
  if (!isV3) {
    keystore = generateKeystore();
    await writeJson(KEYSTORE_FILE, keystore);
  } else {
    keystore = raw as unknown as Keystore;
  }

  const privateKey = decryptKeystore(keystore);
  return { keystore, privateKey };
}
