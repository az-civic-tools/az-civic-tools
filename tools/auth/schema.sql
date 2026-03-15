-- ============================================================
-- Cactus Auth — D1 Schema
-- Central authentication service for cactus.watch apps
-- ============================================================

-- Users — canonical identity
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,          -- UUID v4
  email       TEXT,                      -- nullable (WebAuthn-only users)
  name        TEXT,
  avatar_url  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Partial unique index: only enforce uniqueness when email is non-null
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
  ON users (email) WHERE email IS NOT NULL;

-- OAuth providers — one user can have multiple linked providers
CREATE TABLE IF NOT EXISTS oauth_providers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,            -- 'google', 'github', 'apple', 'microsoft'
  provider_id   TEXT NOT NULL,            -- provider's unique user ID
  email         TEXT,
  name          TEXT,
  avatar_url    TEXT,
  access_token  TEXT,
  refresh_token TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id
  ON oauth_providers (user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_providers_email
  ON oauth_providers (email) WHERE email IS NOT NULL;

-- Sessions — the session ID IS the token
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,          -- UUID v4, used as cookie value
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
  ON sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON sessions (expires_at);

-- WebAuthn credentials — passkey / hardware key registrations
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id   TEXT NOT NULL UNIQUE,
  public_key      TEXT NOT NULL,          -- base64url-encoded
  counter         INTEGER NOT NULL DEFAULT 0,
  device_type     TEXT,
  backed_up       INTEGER NOT NULL DEFAULT 0,
  transports      TEXT,                   -- JSON array of transport strings
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webauthn_user_id
  ON webauthn_credentials (user_id);

-- Magic links — email-based OTP codes
CREATE TABLE IF NOT EXISTS magic_links (
  id          TEXT PRIMARY KEY,          -- UUID v4
  email       TEXT NOT NULL,
  code        TEXT NOT NULL,             -- 6-digit OTP
  used        INTEGER NOT NULL DEFAULT 0,
  app_id      TEXT,
  redirect_uri TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_magic_links_email
  ON magic_links (email);

CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at
  ON magic_links (expires_at);

-- Registered apps — clients that can use the auth service
CREATE TABLE IF NOT EXISTS registered_apps (
  id            TEXT PRIMARY KEY,        -- app identifier slug
  name          TEXT NOT NULL,
  secret        TEXT NOT NULL,           -- hashed app secret
  redirect_uris TEXT NOT NULL,           -- JSON array of allowed redirect URIs
  allowed_origins TEXT,                  -- JSON array of allowed CORS origins
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Auth codes — short-lived codes exchanged for tokens
CREATE TABLE IF NOT EXISTS auth_codes (
  id            TEXT PRIMARY KEY,        -- UUID v4
  code          TEXT NOT NULL UNIQUE,    -- the actual authorization code
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id        TEXT NOT NULL REFERENCES registered_apps(id) ON DELETE CASCADE,
  redirect_uri  TEXT NOT NULL,
  used          INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_codes_code
  ON auth_codes (code);

CREATE INDEX IF NOT EXISTS idx_auth_codes_expires_at
  ON auth_codes (expires_at);
