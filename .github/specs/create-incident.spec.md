---
id: SPEC-002
status: APPROVED
feature: create-incident
created: 2026-04-01
updated: 2026-04-01
author: spec-generator
version: "1.0"
related-specs: [SPEC-001]
---

# Spec: Crear Incidente desde Amenaza (HU-001)

> **Estado:** `APPROVED` — listo para implementar.
> **Ciclo de vida:** DRAFT → **APPROVED** → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
El módulo de creación de incidentes permite vincular una amenaza existente (con severidad `high` o `critical`) a un incidente formal de respuesta. Cada incidente hereda los datos de la amenaza de origen, se crea en estado `open`, y queda disponible para ser clasificado, asignado y gestionado en fases posteriores del IRMS.

### Requerimiento de Negocio
> **RF-001 | Crear incidente desde amenaza:** El sistema debe permitir crear un incidente a partir de una amenaza existente con severidad ALTA o CRÍTICA. El incidente hereda ID, tipo y severidad de la amenaza de origen.
>
> **HU-001 — Recepción automatizada de alertas:** Como analista SOC, quiero que el IRMS reciba las alertas críticas del sistema de amenazas para que ningún incidente quede sin seguimiento.

---

### Historias de Usuario

#### HU-001: Crear Incidente desde Amenaza

```
Como:        Analista SOC o Administrador autenticado
Quiero:      Crear un incidente a partir de una amenaza con severidad ALTA o CRÍTICA
Para:        Iniciar el ciclo de respuesta formal y asegurar trazabilidad amenaza → incidente

Prioridad:   Alta
Estimación:  M
Dependencias: Threat debe existir (POST /api/threats ya implementado)
Capa:        Backend + Frontend
```

#### Criterios de Aceptación — HU-001

**Happy Path**
```gherkin
CRITERIO-1.1: Creación exitosa de incidente desde amenaza de severidad alta
  Dado que:  Existe una amenaza con threatId="uuid-t1", severity="high", type="malware"
             Y el usuario autenticado tiene role="soc_analyst" o role="admin"
  Cuando:    Hace POST /api/incidents con body { "threatId": "uuid-t1" }
  Entonces:  El sistema crea un incidente con status="open"
             Y el incidente hereda: severity="high", type="malware", sourceIp de la amenaza
             Y retorna HTTP 201 con los datos completos del incidente
             Y el incidentId es un UUID nuevo (no el mismo que threatId)

CRITERIO-1.2: Creación exitosa desde amenaza con severidad crítica
  Dado que:  Existe una amenaza con severity="critical"
  Cuando:    Hace POST /api/incidents con body { "threatId": "<id>" }
  Entonces:  El incidente se crea correctamente con status="open"
             Y retorna HTTP 201
```

**Error Path**
```gherkin
CRITERIO-1.3: Rechazo por severidad insuficiente
  Dado que:  Existe una amenaza con severity="low" o severity="medium"
  Cuando:    Hace POST /api/incidents con el threatId de esa amenaza
  Entonces:  El sistema retorna HTTP 422
             Y el mensaje es "Solo amenazas con severidad ALTA o CRÍTICA pueden generar incidentes"
             Y no se crea ningún registro en la tabla incidents

CRITERIO-1.4: Rechazo por incidente duplicado (idempotencia)
  Dado que:  Ya existe un incidente activo (status != 'closed') para la amenaza "uuid-t1"
  Cuando:    El usuario intenta crear otro incidente con el mismo threatId="uuid-t1"
  Entonces:  El sistema retorna HTTP 409
             Y el mensaje es "Ya existe un incidente activo para esta amenaza"
             Y no se crea un registro duplicado

CRITERIO-1.5: Amenaza no encontrada
  Dado que:  No existe ninguna amenaza con el threatId enviado
  Cuando:    Hace POST /api/incidents con body { "threatId": "uuid-inexistente" }
  Entonces:  El sistema retorna HTTP 404 "Threat not found"

CRITERIO-1.6: Acceso no autorizado
  Dado que:  La petición no incluye el header Authorization
  Cuando:    Hace POST /api/incidents
  Entonces:  El sistema retorna HTTP 401 "Unauthorized"
```

**Edge Case**
```gherkin
CRITERIO-1.7: Reapertura permtida si incidente previo está cerrado
  Dado que:  Existe un incidente con status="closed" para la amenaza "uuid-t1"
  Cuando:    El usuario hace POST /api/incidents con threatId="uuid-t1"
  Entonces:  El sistema permite crear un nuevo incidente (el anterior estaba cerrado)
             Y retorna HTTP 201 con el nuevo incidentId

CRITERIO-1.8: Listado de incidentes accesible para todos los roles
  Dado que:  Existe un usuario con role="ciso" y JWT válido
  Cuando:    Hace GET /api/incidents
  Entonces:  El sistema retorna HTTP 200 con la lista de incidentes
```

---

### Reglas de Negocio

1. Solo amenazas con severidad `high` o `critical` pueden originar incidentes.
2. Una amenaza solo puede tener **un incidente activo** simultáneamente (status != 'closed').
3. El incidente hereda de la amenaza: `severity`, `type`, `sourceIp`, `description`.
4. El incidente se crea siempre en estado `open`. No se puede crear en otro estado.
5. El campo `createdBy` se toma automáticamente del JWT del usuario que hace la petición.
6. Los roles `admin` y `soc_analyst` pueden crear incidentes. Los demás solo pueden ver.
7. El listado de incidentes (`GET /api/incidents`) es accesible para todos los roles autenticados.
8. Un incidente cerrado (status='closed') no bloquea la creación de un nuevo incidente para la misma amenaza.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas

| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `incidents` | PostgreSQL | **nueva** | Tabla principal de incidentes del IRMS |
| `threats` | PostgreSQL | sin cambio | Se consulta para validar severidad y heredar datos |
| `users` | PostgreSQL | sin cambio | Referenciado en `created_by` y `assigned_to` |

#### Migración: `002_incidents_and_roles.sql` (ampliación)

```sql
CREATE TABLE IF NOT EXISTS incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_id       VARCHAR(255) NOT NULL,
  title           VARCHAR(500) NOT NULL,
  status          VARCHAR(50)  NOT NULL DEFAULT 'open',
  severity        VARCHAR(50)  NOT NULL,
  type            VARCHAR(100) NOT NULL,
  source_ip       VARCHAR(45),
  description     TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_incident_threat FOREIGN KEY (threat_id) REFERENCES threats(event_id)
);

-- Prevenir duplicados activos: un threatId no puede tener 2 incidentes activos
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_threat_active
  ON incidents(threat_id) WHERE status != 'closed';

-- Índices de búsqueda frecuente
CREATE INDEX IF NOT EXISTS idx_incidents_status     ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity   ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON incidents(assigned_to);
```

#### Entidad `Incident` (domain)

| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | UUID | sí | auto-generado | Identificador único del incidente |
| `threatId` | string | sí | debe existir en threats.event_id | Amenaza de origen |
| `title` | string | sí | auto-generado: "{type} desde {sourceIp}" | Título descriptivo |
| `status` | IncidentStatus | sí | enum: solo 'open' al crear | Estado inicial |
| `severity` | SeverityLevel | sí | heredado de threat: solo 'high' o 'critical' | Severidad |
| `type` | ThreatType | sí | heredado de threat | Tipo de amenaza |
| `sourceIp` | string | no | heredado de threat | IP fuente |
| `description` | string | no | heredado de threat | Descripción |
| `createdBy` | UUID | sí | tomado del JWT | Usuario que creó el incidente |
| `assignedTo` | UUID \| null | no | null al crear | Handler asignado (fase posterior) |
| `createdAt` | Date | sí | auto | Timestamp de creación |
| `updatedAt` | Date | sí | auto | Timestamp de última actualización |

#### Value Object `IncidentStatus`

```typescript
export enum IncidentStatus {
  OPEN            = 'open',
  CLASSIFIED      = 'classified',
  ASSIGNED        = 'assigned',
  IN_CONTAINMENT  = 'in_containment',
  IN_ERADICATION  = 'in_eradication',
  IN_RECOVERY     = 'in_recovery',
  RESOLVED        = 'resolved',
  CLOSED          = 'closed',
  ESCALATED       = 'escalated',
}
```

> Solo `OPEN` y `CLOSED` son relevantes para esta spec. Los demás estados son la base para HU-002 a HU-006 (fuera de alcance de este sprint).

---

### API Endpoints

#### POST /api/incidents
- **Descripción:** Crea un incidente a partir de una amenaza existente de severidad alta o crítica
- **Auth requerida:** sí
- **Roles permitidos:** `admin`, `soc_analyst`
- **Request Body:**
  ```json
  { "threatId": "event-uuid-de-la-amenaza" }
  ```
- **Response 201:**
  ```json
  {
    "success": true,
    "incident": {
      "id":          "uuid-nuevo-incidente",
      "threatId":    "event-uuid-de-la-amenaza",
      "title":       "malware desde 192.168.1.100",
      "status":      "open",
      "severity":    "high",
      "type":        "malware",
      "sourceIp":    "192.168.1.100",
      "description": "Descripción heredada de la amenaza",
      "createdBy":   "uuid-del-usuario",
      "assignedTo":  null,
      "createdAt":   "2026-04-01T10:00:00.000Z",
      "updatedAt":   "2026-04-01T10:00:00.000Z"
    }
  }
  ```
- **Response 401:** token ausente o expirado
- **Response 403:** rol no tiene permiso para crear incidentes
- **Response 404:** `"Threat not found"`
- **Response 409:** `"Ya existe un incidente activo para esta amenaza"`
- **Response 422:** `"Solo amenazas con severidad ALTA o CRÍTICA pueden generar incidentes"`

---

#### GET /api/incidents
- **Descripción:** Lista todos los incidentes (todos los roles autenticados)
- **Auth requerida:** sí
- **Query params opcionales:** `status`, `severity`
- **Response 200:**
  ```json
  {
    "incidents": [
      {
        "id":       "uuid",
        "threatId": "...",
        "title":    "...",
        "status":   "open",
        "severity": "high",
        "type":     "malware",
        "createdBy": "uuid-user",
        "assignedTo": null,
        "createdAt": "..."
      }
    ],
    "total": 1
  }
  ```
- **Response 401:** no autenticado

---

#### GET /api/incidents/:id
- **Descripción:** Detalle de un incidente específico
- **Auth requerida:** sí
- **Response 200:** objeto incident completo
- **Response 404:** incidente no encontrado

---

### Diseño Frontend (Angular)

#### Componentes nuevos

| Componente | Archivo | Descripción |
|---|---|---|
| `IncidentListComponent` | `presentation/components/incident-list/incident-list.component.ts` | Lista de incidentes con status badge y severidad |
| `CreateIncidentButtonComponent` | parte del `DashboardComponent` / `AlertsComponent` | Botón "Crear Incidente" que aparece en amenazas high/critical |

#### Regla de visibilidad del botón (UI)

```typescript
// El botón "Crear Incidente" solo se muestra si:
// 1. La amenaza tiene severity === 'high' || severity === 'critical'
// 2. El usuario tiene role === 'admin' || role === 'soc_analyst'
showCreateIncidentButton(threat: Threat, userRole: string): boolean {
  return ['high', 'critical'].includes(threat.severity)
    && ['admin', 'soc_analyst'].includes(userRole);
}
```

#### Ruta nueva en `app.routes.ts`

```typescript
{
  path: 'incidents',
  loadComponent: () => import('../presentation/components/incident-list/incident-list.component')
    .then(m => m.IncidentListComponent),
  canActivate: [authGuard]
}
```

#### Servicios (infraestructura Angular)

| Función | Archivo | Endpoint |
|---|---|---|
| `createIncident(threatId, token)` | `core/infrastructure/services/incident.service.ts` | `POST /api/incidents` |
| `getIncidents(token)` | mismo | `GET /api/incidents` |
| `getIncidentById(id, token)` | mismo | `GET /api/incidents/:id` |

---

### Arquitectura y Dependencias

- Paquetes nuevos: ninguno
- Servicios externos: PostgreSQL (existente)
- Impacto en server.ts: registrar `incidentRoutes` en `/api/incidents`
- Impacto en ServiceFactory.ts: registrar `CreateIncidentUseCase` y `IncidentRepository`
- Impacto en app.routes.ts: agregar ruta `/incidents` con `authGuard`

### Notas de Implementación

> **Entidad vs. tabla:** La entidad `Incident` se crea en `domain/entities/Incident.ts` siguiendo el patrón de `Threat.ts` (constructor privado + factory method estático `create()`).
>
> **Validación de severidad:** La regla "solo high o critical" se implementa en `CreateIncidentUseCase` (capa de aplicación), no en el controller. Esto garantiza que esté cubierta por unit tests sin depender de HTTP.
>
> **Referencia de FK:** `threat_id` referencia `threats.event_id` (no `threats.id` que es SERIAL). Verificar que el campo `event_id` tiene UNIQUE constraint (ya existe en el schema inicial).
>
> **Constraint UNIQUE condicional:** El índice `WHERE status != 'closed'` garantiza que:
> - Solo 1 incidente activo por amenaza (regla de negocio)
> - Se puede reabrir (crear nuevo incidente) si el anterior está cerrado (CRITERIO-1.7)
>
> **Rol de creación:** La validación de permisos para crear se hace en el middleware de rol antes de llegar al controller. El use case solo recibe `createdBy` del usuario autenticado.

---

## 3. LISTA DE TAREAS

### Backend

#### Dominio
- [ ] Crear `domain/entities/Incident.ts` — entidad con factory method `Incident.create()`
- [ ] Crear `domain/value-objects/IncidentStatus.ts` — enum con 9 estados
- [ ] Crear `domain/ports/IncidentRepository.ts` — interface con `save()`, `findById()`, `findAll()`, `findByThreatId()`

#### Aplicación (Use Cases)
- [ ] Crear `application/use-cases/CreateIncidentUseCase.ts`
  - Recibe: `{ threatId, createdBy }` + ports (ThreatRepository, IncidentRepository)
  - Valida: amenaza existe, severidad suficiente, no hay duplicado activo
  - Crea y persiste el incidente
- [ ] Crear `application/use-cases/ListIncidentsUseCase.ts`
  - Recibe: filtros opcionales (status, severity)
  - Retorna: lista de incidentes como DTOs

#### Infraestructura
- [ ] Crear `infrastructure/persistence/PostgresIncidentRepository.ts`
  - Implementa `IncidentRepository` port
  - Métodos: `save()`, `findById()`, `findAll()`, `findByThreatId()`
- [ ] Ampliar migración `migrations/002_incidents_and_roles.sql` con tabla `incidents`
- [ ] Crear `infrastructure/http/controllers/incident.controller.ts`
  - `POST /` — crear incidente (admin, soc_analyst)
  - `GET /` — listar incidentes (todos los roles)
  - `GET /:id` — detalle (todos los roles)
- [ ] Crear `infrastructure/http/validators/incident.schema.ts` — schema Joi para `threatId`
- [ ] Registrar en `server.ts`: `app.use('/api/incidents', incidentRoutes)`
- [ ] Registrar en `ServiceFactory.ts`: `CreateIncidentUseCase`, `IncidentRepository`

#### Tests Backend (Jest)
- [ ] `unit/domain/entities/Incident.test.ts`
  - [ ] `test_incident_create_success` — factory method crea entidad correctamente
  - [ ] `test_incident_defaults_status_to_open` — status inicial correcto
  - [ ] `test_incident_inherits_threat_data` — severity, type, sourceIp heredados
- [ ] `unit/domain/value-objects/IncidentStatus.test.ts`
  - [ ] `test_valid_statuses_are_defined` — todos los 9 estados presentes
- [ ] `unit/application/use-cases/CreateIncidentUseCase.test.ts`
  - [ ] `test_create_incident_from_high_severity_threat_success`
  - [ ] `test_create_incident_from_critical_severity_threat_success`
  - [ ] `test_create_incident_low_severity_throws_422`
  - [ ] `test_create_incident_medium_severity_throws_422`
  - [ ] `test_create_incident_threat_not_found_throws_404`
  - [ ] `test_create_incident_duplicate_active_throws_409`
  - [ ] `test_create_incident_after_closed_incident_succeeds`
- [ ] `unit/application/use-cases/ListIncidentsUseCase.test.ts`
  - [ ] `test_list_incidents_returns_all`
  - [ ] `test_list_incidents_empty_returns_empty_array`

### Frontend (Angular)

#### Implementación
- [ ] Crear `core/infrastructure/services/incident.service.ts`
- [ ] Crear `presentation/components/incident-list/incident-list.component.ts` + template
- [ ] Agregar botón "Crear Incidente" en componente de alertas/dashboard (visible solo para high/critical + roles permitidos)
- [ ] Registrar ruta `/incidents` en `app/app.routes.ts`

#### Tests Frontend
- [ ] `IncidentListComponent` — renderiza lista de incidentes
- [ ] `IncidentListComponent` — maneja estado vacío
- [ ] Botón "Crear Incidente" — visible solo para severidad high/critical
- [ ] Botón "Crear Incidente" — no visible para roles sin permiso

### QA
- [ ] Generar escenarios Gherkin: CRITERIO-1.1 a 1.8 con datos de prueba
- [ ] Generar análisis de riesgos ASD para create-incident
- [ ] Actualizar AUTO_FRONT_POM con `IncidentPage` (createIncident, listIncidents)
- [ ] Actualizar AUTO_FRONT_SCREENPLAY con Task: `CreateIncidentFromThreat`
- [ ] Actualizar AUTO_API_SCREENPLAY con colección `/api/incidents` (5 escenarios)
- [ ] Actualizar estado spec: `status: IMPLEMENTED`
