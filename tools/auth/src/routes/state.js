/**
 * Cactus Auth — State Parameter Encryption
 *
 * AES-GCM encryption/decryption for the OAuth state parameter.
 * Prevents CSRF and state tampering.
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96-bit IV for AES-GCM
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Encrypt a state payload object.
 *
 * @param {object} payload — JSON-serializable state data
 * @param {string} keyBase64 — base64-encoded 256-bit AES key
 * @returns {Promise<string>} base64url-encoded ciphertext
 */
export const encryptState = async (payload, keyBase64) => {
  const key = await importKey(keyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    plaintext
  );

  // Concatenate IV + ciphertext
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return base64urlEncode(combined);
};

/**
 * Decrypt a state parameter back to the original payload.
 * Validates timestamp is within STATE_MAX_AGE_MS.
 *
 * @param {string} encoded — base64url-encoded ciphertext
 * @param {string} keyBase64 — base64-encoded 256-bit AES key
 * @returns {Promise<object>} decrypted payload
 * @throws {Error} on decryption failure or expired state
 */
export const decryptState = async (encoded, keyBase64) => {
  const key = await importKey(keyBase64);
  const combined = base64urlDecode(encoded);

  if (combined.length < IV_LENGTH + 1) {
    throw new Error('Invalid state parameter');
  }

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );
  } catch {
    throw new Error('State parameter tampered or invalid');
  }

  const payload = JSON.parse(new TextDecoder().decode(plaintext));

  // Validate freshness
  if (!payload.ts || Date.now() - payload.ts > STATE_MAX_AGE_MS) {
    throw new Error('State parameter expired');
  }

  return payload;
};

/* ── Helpers ──────────────────────────────────────────────── */

const importKey = async (keyHex) => {
  const rawKey = hexToBytes(keyHex);
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
};

const hexToBytes = (hex) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

const base64urlEncode = (bytes) => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64urlDecode = (str) => {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};
