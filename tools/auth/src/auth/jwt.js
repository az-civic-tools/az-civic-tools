/**
 * Cactus Auth — JWT Signing & Verification (Ed25519)
 *
 * Uses Web Crypto API for Ed25519 signatures.
 * Tokens have a 15-minute TTL.
 */

const JWT_TTL_SECONDS = 900; // 15 minutes
const ALG = 'EdDSA';

/**
 * Sign a JWT with Ed25519.
 *
 * @param {{ sub: string, email?: string, name?: string, app_id: string }} payload
 * @param {object} config — { jwtPrivateKey }
 * @returns {Promise<string>} signed JWT
 */
export const signJwt = async (payload, config) => {
  const privateKey = await importPrivateKey(config.jwtPrivateKey);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: ALG, typ: 'JWT', kid: 'cactus-auth-1' };

  const claims = Object.freeze({
    ...payload,
    iss: 'https://auth.cactus.watch',
    iat: now,
    exp: now + JWT_TTL_SECONDS,
  });

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = base64urlEncodeBuffer(signature);

  return `${signingInput}.${encodedSignature}`;
};

/**
 * Verify a JWT and return the decoded payload.
 * Throws on invalid or expired tokens.
 *
 * @param {string} token
 * @param {object} config — { jwtPublicKey }
 * @returns {Promise<object>} decoded payload
 */
export const verifyJwt = async (token, config) => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const publicKey = await importPublicKey(config.jwtPublicKey);
  const signatureBytes = base64urlDecodeBuffer(encodedSignature);

  const valid = await crypto.subtle.verify(
    { name: 'Ed25519' },
    publicKey,
    signatureBytes,
    new TextEncoder().encode(signingInput)
  );

  if (!valid) {
    throw new Error('Invalid JWT signature');
  }

  const payload = JSON.parse(base64urlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    throw new Error('JWT expired');
  }

  return payload;
};

/**
 * Export the public key in JWKS format for /.well-known/jwks.json.
 *
 * @param {object} config — { jwtPublicKey }
 * @returns {Promise<object>} JWKS response body
 */
export const getJwks = async (config) => {
  const publicKey = await importPublicKey(config.jwtPublicKey);
  const exported = await crypto.subtle.exportKey('jwk', publicKey);

  return Object.freeze({
    keys: [
      Object.freeze({
        ...exported,
        kid: 'cactus-auth-1',
        alg: ALG,
        use: 'sig',
      }),
    ],
  });
};

/* ── Helpers ──────────────────────────────────────────────── */

const importPrivateKey = async (base64urlKey) =>
  crypto.subtle.importKey(
    'pkcs8',
    base64urlDecodeBuffer(base64urlKey),
    { name: 'Ed25519' },
    false,
    ['sign']
  );

const importPublicKey = async (base64urlKey) =>
  crypto.subtle.importKey(
    'spki',
    base64urlDecodeBuffer(base64urlKey),
    { name: 'Ed25519' },
    true,
    ['verify']
  );

const base64urlEncode = (str) => {
  const bytes = new TextEncoder().encode(str);
  return base64urlEncodeBuffer(bytes.buffer);
};

const base64urlDecode = (str) => {
  const bytes = base64urlDecodeBuffer(str);
  return new TextDecoder().decode(bytes);
};

const base64urlEncodeBuffer = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64urlDecodeBuffer = (str) => {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};
