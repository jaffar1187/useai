export interface Keystore {
  publicKey: string;
  encryptedPrivateKey: string;
  iv: string;
  authTag: string;
  createdAt: string;
}
