-- CyberGuard System - Initial Schema
-- PostgreSQL 15+

-- Users table (synced from Firebase on first login)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(255) UNIQUE NOT NULL,
  email         VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'viewer',
  is_locked     BOOLEAN NOT NULL DEFAULT false,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Threats table
CREATE TABLE IF NOT EXISTS threats (
  id            SERIAL PRIMARY KEY,
  event_id      VARCHAR(255) UNIQUE NOT NULL,
  type          VARCHAR(100) NOT NULL,
  severity      VARCHAR(50) NOT NULL,
  source_ip     VARCHAR(45) NOT NULL,
  target_ip     VARCHAR(45),
  description   TEXT,
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id            SERIAL PRIMARY KEY,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  action        VARCHAR(100) NOT NULL,
  status        VARCHAR(20) NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  details       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_threats_type ON threats(type);
CREATE INDEX IF NOT EXISTS idx_threats_severity ON threats(severity);
CREATE INDEX IF NOT EXISTS idx_threats_created_at ON threats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threats_source_ip ON threats(source_ip);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Seed: Admin user pre-created so first login gets role='admin' automatically.
-- Two rows cover both username formats: 'admin' and 'admin@cyberguard.com'.
-- ON CONFLICT DO NOTHING: safe to re-run, never overwrites manual changes.
INSERT INTO users (id, username, email, role, is_locked, failed_attempts, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@cyberguard.com',
  'admin',
  false,
  0,
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

INSERT INTO users (id, username, email, role, is_locked, failed_attempts, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@cyberguard.com',
  'admin@cyberguard.com',
  'admin',
  false,
  0,
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;
