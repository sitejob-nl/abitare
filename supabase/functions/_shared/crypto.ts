// AES-256-GCM encryption utilities for secure token storage

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits

/**
 * Derives a CryptoKey from the encryption key secret
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyBase64 = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!keyBase64) {
    throw new Error("TOKEN_ENCRYPTION_KEY not configured");
  }

  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  
  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Returns base64-encoded string: IV (12 bytes) + ciphertext + auth tag
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    data
  );

  // Combine IV + ciphertext (includes auth tag)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts an encrypted token string
 * Expects base64-encoded string: IV (12 bytes) + ciphertext + auth tag
 */
export async function decryptToken(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey();
  
  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Checks if a token appears to be encrypted (base64 with proper length)
 * Used to handle migration from unencrypted to encrypted tokens
 */
export function isEncrypted(token: string): boolean {
  // Encrypted tokens will be base64 and have minimum length for IV + some ciphertext
  // Unencrypted tokens are typically JWT format or raw OAuth tokens
  try {
    const decoded = atob(token);
    // Minimum: 12 bytes IV + 16 bytes (minimum ciphertext + tag)
    return decoded.length >= 28 && !token.includes(".");
  } catch {
    return false;
  }
}
