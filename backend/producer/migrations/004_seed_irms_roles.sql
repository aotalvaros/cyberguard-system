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
) ON CONFLICT (username) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

INSERT INTO users (id, username, email, full_name, role, is_active, is_locked, failed_attempts, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'incident.handler2',
  'incident.handler2@cyberguard.com',
  'Incident Handler 2',
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
) ON CONFLICT (username) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

INSERT INTO users (id, username, email, full_name, role, is_active, is_locked, failed_attempts, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'incident.manager',
  'incident.manager@cyberguard.com',
  'Incident Manager',
  'incident_manager',
  true,
  false,
  0,
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- CISO — vista ejecutiva
INSERT INTO users (id, username, email, full_name, role, is_active, is_locked, failed_attempts, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ciso',
  'ciso@cyberguard.com',
  'CISO',
  'ciso',
  true,
  false,
  0,
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;
