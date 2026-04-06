-- =============================================================================
-- CyberGuard System — Migración 002
-- IRMS: Gestión de Usuarios + Tabla de Incidentes
-- Spec: SPEC-001 (user-management) + SPEC-002 (create-incident)
-- Fecha: 2026-04-01
-- =============================================================================
-- SEGURIDAD: Todas las operaciones son idempotentes (IF NOT EXISTS / ON CONFLICT).
--            Nunca hace DROP, nunca modifica tipos de columnas existentes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SPEC-001: Ampliar tabla users para HU-008 (Gestión de Usuarios IRMS)
-- -----------------------------------------------------------------------------

-- Nuevo: nombre completo del usuario (HU-008.1 campo obligatorio en UI)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Nuevo: flag de desactivación administrativa (HU-008.3)
-- DISTINCT de is_locked: is_locked = brute-force, is_active = desactivación manual
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Índice para filtrar usuarios activos/inactivos eficientemente
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Migrar roles legacy → roles IRMS
-- Los roles anteriores (analyst, viewer) se mapean a los nuevos roles del IRMS.
-- admin se mantiene igual.
UPDATE users SET role = 'soc_analyst'      WHERE role = 'analyst';
UPDATE users SET role = 'ciso'             WHERE role = 'viewer';
-- 'admin' no necesita cambio

-- Comentario en tabla para documentar los roles válidos del IRMS
COMMENT ON COLUMN users.role IS
  'Roles válidos IRMS: admin | soc_analyst | incident_handler | incident_manager | ciso';

-- -----------------------------------------------------------------------------
-- SPEC-002: Nueva tabla incidents para HU-001 (Creación de Incidentes)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS incidents (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencia a la amenaza de origen (hereda sus datos)
  threat_id     VARCHAR(255) NOT NULL,

  -- Datos heredados de la amenaza en el momento de creación
  title         VARCHAR(500) NOT NULL,
  status        VARCHAR(50)  NOT NULL DEFAULT 'open',
  severity      VARCHAR(50)  NOT NULL,   -- 'high' | 'critical' (regla de negocio)
  type          VARCHAR(100) NOT NULL,   -- malware | intrusion | phishing | ddos | ransomware
  source_ip     VARCHAR(45),

  -- Descripción heredada de la amenaza
  description   TEXT,

  -- Trazabilidad de gestión
  created_by    UUID         REFERENCES users(id) ON DELETE SET NULL,
  assigned_to   UUID         REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- FK hacia threats.event_id
  CONSTRAINT fk_incident_threat
    FOREIGN KEY (threat_id)
    REFERENCES threats(event_id)
    ON DELETE RESTRICT   -- no permitir borrar una amenaza si tiene incidentes
);

-- Regla de negocio clave: una amenaza solo puede tener UN incidente activo.
-- El índice único condicional (WHERE status != 'closed') permite:
--   ✅ Una amenaza → 1 incidente activo
--   ✅ Crear nuevo incidente si el anterior fue cerrado (reapertura — CRITERIO-1.7)
--   ❌ Duplicados cuando ya existe incidente activo (CRITERIO-1.4)
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_threat_active
  ON incidents(threat_id)
  WHERE status != 'closed';

-- Índices de búsqueda y filtrado frecuente
CREATE INDEX IF NOT EXISTS idx_incidents_status
  ON incidents(status);

CREATE INDEX IF NOT EXISTS idx_incidents_severity
  ON incidents(severity);

CREATE INDEX IF NOT EXISTS idx_incidents_created_at
  ON incidents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to
  ON incidents(assigned_to)
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_created_by
  ON incidents(created_by);

-- Comentarios de documentación
COMMENT ON TABLE incidents IS
  'Incidentes del IRMS. Creados a partir de amenazas con severidad high o critical.';

COMMENT ON COLUMN incidents.status IS
  'Estados válidos: open | classified | assigned | in_containment | in_eradication | in_recovery | resolved | closed | escalated';

COMMENT ON COLUMN incidents.threat_id IS
  'Referencia a threats.event_id. Un incidente hereda los datos de la amenaza de origen.';

COMMENT ON COLUMN incidents.assigned_to IS
  'NULL cuando no hay handler asignado (incidente recién creado o usuario desactivado).';
