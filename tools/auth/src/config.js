/**
 * Cactus Auth — Environment Configuration
 *
 * Reads environment variables and secrets from the Worker env object.
 * Provides typed access with validation at startup.
 */

/**
 * Build a config object from Worker env bindings.
 * Throws if required secrets are missing.
 *
 * @param {object} env — Worker environment bindings
 * @returns {object} frozen config
 */
export const buildConfig = (env) => {
  const missing = [];

  const requireSecret = (name) => {
    const value = env[name];
    if (!value) missing.push(name);
    return value || '';
  };

  // OAuth providers are optional — service works without them (buttons greyed out)
  const optionalSecret = (name) => env[name] || '';

  const config = {
    // Domain settings (from [vars])
    authDomain: env.AUTH_DOMAIN || 'auth.cactus.watch',
    cookieDomain: env.COOKIE_DOMAIN || '.cactus.watch',
    sessionTtlDays: parseInt(env.SESSION_TTL_DAYS || '30', 10),
    environment: env.ENVIRONMENT || 'development',

    // OAuth — Google (optional until configured)
    googleClientId: optionalSecret('GOOGLE_CLIENT_ID'),
    googleClientSecret: optionalSecret('GOOGLE_CLIENT_SECRET'),

    // State encryption (required)
    stateEncryptionKey: requireSecret('STATE_ENCRYPTION_KEY'),

    // Email (optional — will log to console if missing)
    resendApiKey: optionalSecret('RESEND_API_KEY'),

    // JWT signing keys (required)
    jwtPrivateKey: requireSecret('JWT_PRIVATE_KEY'),
    jwtPublicKey: requireSecret('JWT_PUBLIC_KEY'),

    // Computed
    sessionTtlSeconds: parseInt(env.SESSION_TTL_DAYS || '30', 10) * 86400,
    isProduction: (env.ENVIRONMENT || 'development') === 'production',
  };

  if (missing.length > 0 && config.isProduction) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }

  return Object.freeze(config);
};

/**
 * Get session cookie Max-Age in seconds.
 */
export const getSessionMaxAge = (config) => config.sessionTtlDays * 86400;

/**
 * Whether the current environment is development.
 */
export const isDev = (config) => !config.isProduction;
