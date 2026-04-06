-- CyberGuard System - Initial Schema
-- PostgreSQL 15+

-- Users table (synced from Firebase on first login)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(255) UNIQUE NOT NULL,
  email         VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255),
  role          VARCHAR(50) NOT NULL DEFAULT 'viewer',
  is_active     BOOLEAN NOT NULL DEFAULT true,
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

-- Incidents table (IRMS — HU-001)
CREATE TABLE IF NOT EXISTS incidents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_id     VARCHAR(255) NOT NULL,
  title         VARCHAR(500) NOT NULL,
  status        VARCHAR(50)  NOT NULL DEFAULT 'open',
  severity      VARCHAR(50)  NOT NULL,
  type          VARCHAR(100) NOT NULL,
  source_ip     VARCHAR(45),
  description   TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_incident_threat
    FOREIGN KEY (threat_id)
    REFERENCES threats(event_id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_threat_active
  ON incidents(threat_id)
  WHERE status != 'closed';

CREATE INDEX IF NOT EXISTS idx_incidents_status     ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity   ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_threat_id  ON incidents(threat_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created_by ON incidents(created_by);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON incidents(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_active      ON users(is_active);

-- Seed: Admin user
INSERT INTO users (id, username, email, full_name, role, is_active, is_locked, failed_attempts, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@cyberguard.com',
  'Administrador',
  'admin',
  true,
  false,
  0,
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

INSERT INTO users (id, username, email, full_name, role, is_active, is_locked, failed_attempts, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'incident.handler',
  'incident.handler@cyberguard.com',
  'Incident Handler',
  'incident_handler',
  true,
  false,
  0,
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

INSERT INTO users (id, username, email, full_name, role, is_active, is_locked, failed_attempts, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'soc',
  'soc@cyberguard.com',
  'Analista SOC',
  'soc_analyst',
  true,
  false,
  0,
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;
