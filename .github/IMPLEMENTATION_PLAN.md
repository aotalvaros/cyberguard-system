# Plan de Implementación — IRMS Feature (Semana 7-8 Examen Final)

> **Autor:** Andrés Otalvaro — AI-Native Full Cycle Engineer  
> **Fecha de inicio:** 2026-04-01  
> **Fecha de cierre:** 2026-04-05  
> **Sprint:** 5 días, equipo de 1 persona  
> **Rol integrado:** Dev (Backend + Frontend) + QA Automation + Arquitectura

---

## 0. ANÁLISIS DE LA RÚBRICA Y ESTRATEGIA DE MAXIMIZACIÓN DE VALOR

### Rubrica desglosada

| Criterio | Peso implícito | Qué evalúan | Mi estrategia |
|---|---|---|---|
| **Implementación y Arquitectura (Dev)** | Alto | Feature refleja diseño Semana 6. Código limpio. SOLID. Hexagonal. Cero "código basura" de IA. | Respetar capas existentes (`domain/ports/` → `application/use-cases/` → `infrastructure/`). Cada nuevo archivo sigue el patrón probado de `Threat.ts`, `ListThreatsUseCase.ts`, etc. |
| **Pruebas Unitarias (Dev)** | Alto | Alta cobertura lógica. Mocks perfectos. Pruebas como documentación viva. | Jest + TSMock. Patrón AAA. Mocks de repositorios (ports). Cubrir happy path + error path + edge cases. |
| **Maestría en Automatización (QA)** | Alto | 3 repos actualizados: POM, Screenplay Front, Screenplay API. Reusables y declarativos. | Actualizar los 3 repos externos con los nuevos flujos: gestión de usuarios + creación de incidente. |
| **Simbiosis Humano-IA (HITL Final)** | Alto | Correcciones arquitectónicas del humano sobre sugerencias de IA. Dominio total. | Documentar cada decisión arquitectónica, cada corrección aplicada, y qué aporté yo vs. qué descarte de la IA. |

### Decisión de alcance: ¿Por qué HU-001 + HU-008 (épica)?

Con 5 días y 1 persona, cubrimos **1 HU del core IRMS + 1 épica de administración** porque:

1. **HU-001** demuestra capacidad de crear una **nueva entidad de dominio** (Incident) integrada con la existente (Threat). Es la pieza central del IRMS y muestra dominio de Hexagonal Architecture.
2. **HU-008 (épica)** demuestra un **CRUD completo** con validaciones de negocio sofisticadas (roles, auto-bloqueo, desactivación con reasignación de incidentes). Es visible en la UI y fácil de demostrar en la sustentación.
3. Juntas cubren tanto **dominio nuevo** (Incident) como **extensión de dominio existente** (User management avanzado), lo cual evidencia las dos direcciones de trabajo que espera la rúbrica.

### HUs descartadas y justificación

| HU | Razón de exclusión |
|---|---|
| HU-002 a HU-006 | Requieren la máquina de estados completa + playbooks + SLA. Viables solo si HU-001 existiera previamente. No son demostrables en 5 días. |
| HU-007 | Dashboard ejecutivo CISO. Requiere WebSocket + métricas en tiempo real. Complejidad frontend alta para 5 días. |
| HU-009 | Ver análisis extendido abajo (§ 0.6). Descartada: RBAC estático cubre los mismos requisitos de seguridad que el RBAC dinámico para el alcance de 5 días. |

### HU-010 — Menú lateral desplegable

**Como usuario autenticado, quiero un menú lateral colapsable con íconos y etiquetas de navegación para moverme entre módulos del sistema sin perder contexto visual.**

- El menú muestra las siguientes secciones: Dashboard, Reportar Amenaza, Incidentes, Gestión de Usuarios (solo admin)
- Puede contraerse a modo "solo íconos" y expandirse al pasar el cursor o hacer clic
- Sección "Gestión de Usuarios" solo visible para rol `admin`
- Estado de colapso persiste en `localStorage`
- Indicador visual de la ruta activa

**Justificación:** Mejora notable de UX demostrable en sustentación. Bajo riesgo (solo frontend). Reutiliza las rutas ya existentes en `app.routes.ts`.

---

## 0.5 ANÁLISIS TÉCNICO CRÍTICO: GAP FIREBASE EN HU-008

> Este análisis es fundamental para defender correctamente la implementación en la sustentación.

### ¿Cómo funciona el login actualmente?

```
Usuario escribe "admin" + contraseña
    ↓
FirebaseAuthProvider.mapUsernameToEmail("admin") → "admin@cyberguard.com"
    ↓
Firebase SDK: signInWithEmailAndPassword("admin@cyberguard.com", password)
    ↓
Firebase retorna FirebaseUser con UID + Custom Claims { role: 'admin' }
    ↓
AuthService busca el usuario en PostgreSQL por username
    ↓
Si no existe en PostgreSQL → lo crea automáticamente con el rol del Custom Claim
    ↓
Retorna JWT propio: { id: firebaseUID, username, role }
```

### GAP IDENTIFICADO: CreateUserUseCase no crea cuenta Firebase

| Capa | Qué hace | Problema |
|---|---|---|
| `CreateUserUseCase.execute()` | Guarda el usuario en **PostgreSQL** | ✅ correcto |
| `CreateUserUseCase.execute()` | NO llama a `authProvider.createUser()` | ❌ gap |
| `FirebaseAuthProvider` | Solo implementa `authenticate()` | ❌ `createUser()` no está implementado |
| Firebase Admin SDK | No está instalado en el backend | ❌ necesario para crear usuarios en Firebase desde servidor |

**Consecuencia práctica:** Un usuario creado mediante `POST /api/admin/users` existe en PostgreSQL **pero no puede hacer login** porque Firebase no tiene una cuenta para él.

### ¿Qué contraseña se usa?

Las contraseñas las gestiona **exclusivamente Firebase Auth**. No se almacenan en PostgreSQL. Para que un usuario creado vía admin panel pueda ingresar, alguien debe ir al **Firebase Console → Authentication → Add User** y crear la cuenta manualmente con el mismo email.

### ¿Qué pueden hacer los usuarios creados desde el panel?

| Acción | Estado |
|---|---|
| Aparecer en la tabla de usuarios | ✅ visible inmediatamente |
| Tener rol actualizado (PUT endpoint) | ✅ funcional |
| Ser desactivado/reactivado | ✅ funcional |
| Hacer login en la plataforma | ❌ requiere cuenta Firebase previa |

### Defensa en sustentación

> "La implementación actual completa el ciclo de gestión (crear, editar, activar/desactivar) en la capa de datos. El gap de Firebase es una deuda técnica documentada: `FirebaseAuthProvider` expone el port `createUser?()` como opcional, pero la implementación requiere el Firebase Admin SDK con service account — dependencia externa que está fuera del alcance del sprint de 5 días. La solución completa sería usar `firebase-admin` en el backend para crear la cuenta y asignar el Custom Claim del rol en el mismo transaction."

---

## 0.6 ANÁLISIS DE HU-009 — Configuración de Permisos por Rol (Descartada conscientemente)

> Este análisis documenta la decisión arquitectónica de implementar RBAC estático en lugar del motor dinámico que pide HU-009.

### ¿Qué pide HU-009 exactamente?

El RFC define que el Administrador pueda **desde la UI** activar/desactivar permisos por rol sobre recursos específicos. Los cambios aplican inmediatamente sin reiniciar. Todo queda en auditoría.

La matriz de permisos del RFC es:

| Permiso / Rol | Agente PPC | Analista SOC | Incident Handler | Incident Manager | CISO | Administrador |
|---|---|---|---|---|---|---|
| Ver incidentes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Crear incidente | ✓ | ✓ | | ✓ | | |
| Clasificar incidente | | ✓ | | | | |
| Asignar handler | | | | ✓ | | |
| Actualizar estado | | | ✓ | ✓ | | |
| Cerrar incidente | | | | ✓ | | |
| Ver dashboard ejecutivo | | | | | ✓ | ✓ |
| Gestionar usuarios | | | | | | ✓ |
| Ver audit trail | | | | ✓ | ✓ | ✓ |

### ¿Qué habría que construir para HU-009?

| Capa | Componente nuevo | Esfuerzo estimado |
|---|---|---|
| DB | Tabla `role_permissions (role, action, resource, enabled BOOLEAN)` + migración 003 | 30min |
| Domain | Port `PermissionRepository` + Value Object `Permission` | 1h |
| Application | `CheckPermissionUseCase` + `UpdatePermissionsUseCase` | 1.5h |
| Infrastructure | `PostgresPermissionRepository` + `permissions.controller` (GET/PUT endpoints) | 1.5h |
| Middleware | Reemplazar `requireAdmin` → `requirePermission('ACCION')` con consulta a DB | **2h + rompe 867 tests** |
| Frontend | Componente matriz (tabla roles × acciones con toggles) | 1.5h |
| Tests unitarios | ≥ 15 tests nuevos para todo lo anterior | 1.5h |
| **Total** | | **~9.5h** |

### ¿Por qué NO se implementa en este sprint?

**Razón 1 — Tiempo agotado:** Es 3 de abril. El sprint cierra el 5. Día 4 está asignado a HU-010 (sidebar) + frontend tests. Día 5 a QA repos + PR + evidencia. No hay 9.5h disponibles.

**Razón 2 — Rompe la suite de tests verde:** El middleware actual (`requireAdmin`) es usado directamente en los controllers. Migrarlo a `requirePermission()` con consulta a BD requeriría mockear la nueva dependencia en 15+ test files que ya están estables (867 tests).

**Razón 3 — Bajo valor de demostración:** En 20 minutos de sustentación, esta feature requeriría un script específico para demostrar el toggle. Si no funciona en vivo, es un riesgo alto con ninguna recompensa visible.

**Razón 4 — El objetivo ya se cumple estáticamente:** La matriz del RFC está implementada como RBAC estático en el código. Eso es seguro, auditable y correcto — solo que no es configurable en runtime.

### RBAC Estático actual vs HU-009 RBAC Dinámico

| Aspecto | Implementado (estático) | HU-009 (dinámico) |
|---|---|---|
| Seguridad | ✅ equivalente | ✅ equivalente |
| Rol admin obligatorio para `/api/admin` | ✅ `requireAdmin` middleware | ✅ `requirePermission('GESTIONAR_USUARIOS')` |
| Solo admin/soc_analyst crean incidentes | ✅ validado en `incident.controller` | ✅ consultaría tabla DB |
| Cambio de permisos sin reiniciar | ❌ requiere redeploy | ✅ en caliente |
| UI para gestionar permisos | ❌ no existe | ✅ panel de admin |
| Auditoría de cambios | ❌ no aplica (estático) | ✅ en `audit_logs` |

### ADR-006: RBAC estático suficiente para sprint de 5 días

- **Decisión:** Implementar control de acceso mediante roles hardcodeados en middleware y controllers. NO construir el motor de permisos dinámico de HU-009.
- **Por qué:** HU-009 requiere ~9.5h adicionales y rompe la suite de tests existente. El RBAC estático cumple los mismos requisitos de seguridad del RFC para el alcance del sprint.
- **Qué se implementó:** `requireAdmin` en todas las rutas de administración. Validación de rol `soc_analyst|admin` en `incident.controller`. `adminGuard` en el frontend.
- **Deuda generada:** HU-009 queda como **primer ticket del Sprint 2**. El path de implementación está documentado en esta sección.
- **Defensa en sustentación:** *"La matriz de permisos del RFC está implementada. La diferencia con HU-009 es que la implementación actual es estática (definida en código) vs dinámica (configurable en runtime). Elegí el RBAC estático por pragmatismo: misma seguridad, cero riesgo de breaking changes, y el motor dinámico sería el primer ticket del siguiente sprint."*

### Próximos pasos para Sprint 2 (referencia futura)

```
Sprint 2 — HU-009 implementation path:
1. chore(db): migration 003 — create role_permissions table with seeded defaults (RFC matrix)
2. feat(domain): add PermissionRepository port + Permission value object
3. feat(application): add CheckPermissionUseCase (replaces requireAdmin logic)
4. feat(infrastructure): add PostgresPermissionRepository + GET/PUT /api/admin/permissions
5. refactor(middleware): replace requireAdmin with requirePermission('action') — update all tests
6. feat(frontend): add permissions-matrix component (admin-only route)
7. test: add full suite for permission use cases and middleware
```

---

## 1. INVENTARIO DEL CODEBASE ACTUAL

### Backend (TypeScript / Express / Hexagonal)

```
backend/producer/src/
├── domain/
│   ├── entities/        → Threat.ts (única entidad)
│   ├── exceptions/      → ThreatNotFoundException.ts
│   ├── ports/           → UserRepository.ts, ThreatRepository.ts, AuditLogRepository.ts,
│   │                      AuthProvider.ts, EventPublisher.ts, TokenService.ts,
│   │                      ThreatClassificationStrategy.ts, ThreatStatisticsRepository.ts
│   └── services/        → ThreatClassifier.ts
├── application/
│   ├── use-cases/       → ListThreatsUseCase.ts, DeleteThreatUseCase.ts,
│   │                      GetThreatStatisticsUseCase.ts
│   └── services/        → threat.service.ts, AuthService.ts
├── infrastructure/
│   ├── http/controllers/→ auth, threat, admin, statistics
│   ├── http/middlewares/ → auth, bruteforce, error, validation
│   ├── http/validators/  → schemas Joi
│   ├── persistence/     → PostgresUserRepo, PostgresThreatRepo, PostgresAuditLogRepo,
│   │                      PostgresThreatStatisticsRepo
│   ├── factories/       → ServiceFactory.ts (DI manual)
│   ├── config/          → database, env, logger, rabbitmq
│   ├── providers/       → FirebaseAuth, JWTToken, RabbitMQPublisher
│   └── classification/  → Estrategias de clasificación por tipo
└── server.ts            → Express app + rutas montadas
```

### Frontend (Angular v2 / Hexagonal)

```
frontend/cyberguard-system-appv2/src/
├── app/                 → app.routes.ts (auth, dashboard, report-threat)
├── core/
│   ├── domain/models/   → Modelos de dominio
│   ├── domain/ports/    → Puertos abstractos
│   ├── application/     → use-cases/
│   └── infrastructure/  → adapters/, dto/, services/, state/, interceptors/
├── presentation/
│   ├── components/      → autenticacion/, dashboard/, report-threat/, alerts/
│   └── guards/          → auth.guard.ts, admin.guard.ts
└── shared/              → Componentes compartidos
```

### Base de datos (PostgreSQL)

Tablas existentes: `users`, `threats`, `audit_logs`

Roles actuales en código: `admin`, `analyst`, `viewer`

### Lo que ya existe y reutilizamos

| Recurso | Existe | Reutilizamos |
|---|---|---|
| Tabla `users` (PostgreSQL) | ✅ | Sí — agregar campo `is_active` y ampliar `role` enum |
| `UserRepository` port | ✅ | Sí — extender con `findByEmail()`, `deactivate()`, `activate()` |
| `PostgresUserRepository` | ✅ | Sí — agregar implementación de nuevos métodos |
| `admin.controller.ts` | ✅ | Sí — extender con endpoints CRUD de usuarios |
| `ServiceFactory.ts` | ✅ | Sí — registrar nuevos use cases e Incident |
| `audit_logs` tabla | ✅ | Sí — registrar acciones de gestión de usuarios |
| `authMiddleware` + `requireAdmin` | ✅ | Sí — reutilizar para proteger endpoints |
| `authGuard` + `adminGuard` (frontend) | ✅ | Sí — reutilizar para proteger rutas |

### Lo que falta crear

| Recurso | HU | Capa |
|---|---|---|
| Entidad `Incident.ts` | HU-001 | domain/entities |
| Value Object `IncidentStatus.ts` | HU-001 | domain/value-objects |
| Port `IncidentRepository.ts` | HU-001 | domain/ports |
| `CreateIncidentUseCase.ts` | HU-001 | application/use-cases |
| `PostgresIncidentRepository.ts` | HU-001 | infrastructure/persistence |
| `incident.controller.ts` | HU-001 | infrastructure/http/controllers |
| `incident.schema.ts` (Joi) | HU-001 | infrastructure/http/validators |
| Migración `002_incidents_and_roles.sql` | HU-001 + HU-008 | migrations |
| `CreateUserUseCase.ts` | HU-008.1 | application/use-cases |
| `UpdateUserUseCase.ts` | HU-008.2 | application/use-cases |
| `ToggleUserStatusUseCase.ts` | HU-008.3 | application/use-cases |
| Componente `user-management/` | HU-008 | frontend/presentation/components |
| Componente `incident-list/` | HU-001 | frontend/presentation/components |
| Servicio `UserAdminService` | HU-008 | frontend/core/infrastructure/services |
| Servicio `IncidentService` | HU-001 | frontend/core/infrastructure/services |

---

## 2. DECISIONES ARQUITECTÓNICAS (ADRs)

### ADR-001: Mantener Arquitectura Hexagonal consistente

- **Decisión:** Todo código nuevo sigue la arquitectura hexagonal existente: `domain/ → application/ → infrastructure/`.
- **Por qué:** Consistencia con el codebase (no reinventar), testabilidad (mock de ports), y es lo que la rúbrica evalúa como "respetar la arquitectura previa".
- **Alternativa descartada:** Clean Architecture con capas adicionales. Innecesario, el proyecto ya funciona con esta variante.

### ADR-002: Ampliar roles a 5 (SOC, Handler, Manager, CISO, Admin)

- **Decisión:** El campo `role` en la tabla `users` pasará de 3 valores (admin, analyst, viewer) a 5 valores alineados con el IRMS (admin, soc_analyst, incident_handler, incident_manager, ciso).
- **Por qué:** El RFC del IRMS define un modelo RBAC con 5+ roles. Implementar el subconjunto mínimo viable para que HU-008 cree usuarios con roles que tengan significado operacional.
- **Impacto:** Migración SQL que amplía el constraint. El middleware `requireAdmin` sigue igual. Se añade un enum `UserRole` al dominio.
- **Retrocompatibilidad:** Los roles existentes se mapean: `admin` → `admin`, `analyst` → `soc_analyst`, `viewer` → `ciso`.

### ADR-003: Incident como nueva entidad vinculada a Threat

- **Decisión:** La tabla `incidents` referencia a `threats` via `threat_id`. Un incidente se crea desde una amenaza con severidad `high` o `critical`.
- **Por qué:** Modelo relacional coherente con el diseño del RFC sección 6. Permite trazabilidad amenaza → incidente.
- **Constraint:** Una amenaza solo puede tener 1 incidente activo (UNIQUE constraint condicional).

### ADR-004: ServiceFactory como mecanismo de DI

- **Decisión:** Registrar nuevos use cases y repositorios en el `ServiceFactory.ts` existente.
- **Por qué:** Consistencia. El proyecto ya usa este patrón (no usa un contenedor IoC externo). Cambiar a InversifyJS o similar sería sobre-ingeniería para 5 días.

### ADR-005: Campo `is_active` en lugar de soft-delete

- **Decisión:** Para HU-008.3, agregar columna `is_active BOOLEAN DEFAULT true` a la tabla `users`. No eliminar datos del usuario.
- **Por qué:** La HU especifica "desactivar temporalmente sin eliminar datos permanentemente". El campo `is_locked` existente es para brute-force, no para desactivación administrativa.

### ADR-006: RBAC estático en lugar de motor dinámico (HU-009 descartada)

- **Decisión:** Implementar control de acceso con roles hardcodeados en middleware y controllers. NO construir el motor de permisos dinámico de HU-009 en este sprint.
- **Por qué:** HU-009 requiere ~9.5h adicionales y obligaría a refactorizar el middleware de autenticación, lo que rompería 867 tests estables. El RBAC estático implementa la misma matriz del RFC con igual nivel de seguridad.
- **Contrapartida:** Los permisos no son configurables en runtime desde la UI. Cambiar un permiso requiere redeploy.
- **Ver análisis completo en §0.6.**

---

## 3. MODELO DE DATOS (CAMBIOS)

### Migración `002_incidents_and_roles.sql`

```sql
-- Nueva columna para desactivación administrativa
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Ampliar roles (constraint o update de validación en app layer)
-- Los roles válidos serán: admin, soc_analyst, incident_handler, incident_manager, ciso

-- Tabla de incidentes
CREATE TABLE IF NOT EXISTS incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_id       VARCHAR(255) NOT NULL,           -- referencia al event_id de threats
  title           VARCHAR(500) NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'open',
  severity        VARCHAR(50) NOT NULL,
  type            VARCHAR(100) NOT NULL,
  source_ip       VARCHAR(45),
  description     TEXT,
  created_by      UUID REFERENCES users(id),
  assigned_to     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_threat FOREIGN KEY (threat_id) REFERENCES threats(event_id)
);

-- Evitar incidentes duplicados para la misma amenaza
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_threat_id_active
  ON incidents(threat_id) WHERE status != 'closed';

-- Índices
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
```

### Entidad de dominio: Incident

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `id` | UUID | sí | auto-generado |
| `threatId` | string | sí | must exist in threats.event_id |
| `title` | string | sí | max 500 chars |
| `status` | IncidentStatus | sí | enum: open |
| `severity` | SeverityLevel | sí | inherited from threat |
| `type` | ThreatType | sí | inherited from threat |
| `sourceIp` | string | no | inherited from threat |
| `description` | string | no | inherited from threat |
| `createdBy` | UUID | sí | current user id |
| `assignedTo` | UUID | no | null initially |
| `createdAt` | Date | sí | auto |
| `updatedAt` | Date | sí | auto |

### Ampliación del modelo User

| Campo nuevo | Tipo | Default | Propósito |
|---|---|---|---|
| `is_active` | boolean | true | HU-008.3: desactivación/reactivación |
| `full_name` | string | null | HU-008.1: nombre completo del usuario |

---

## 4. API ENDPOINTS (DISEÑO)

### Endpoints HU-008 — Gestión de usuarios

| Método | Ruta | Descripción | Auth | Rol |
|---|---|---|---|---|
| `POST` | `/api/admin/users` | Crear usuario | JWT | admin |
| `GET` | `/api/admin/users` | Listar todos los usuarios | JWT | admin |
| `GET` | `/api/admin/users/:id` | Obtener detalle de usuario | JWT | admin |
| `PUT` | `/api/admin/users/:id` | Modificar usuario (nombre, rol) | JWT | admin |
| `PATCH` | `/api/admin/users/:id/status` | Activar/desactivar usuario | JWT | admin |

#### POST /api/admin/users (HU-008.1)
```json
// Request
{
  "email": "ana.torres@example.com",
  "fullName": "Ana Torres",
  "role": "soc_analyst",
  "username": "ana.torres"
}

// Response 201
{
  "success": true,
  "user": { "id": "uuid", "username": "ana.torres", "email": "...", "role": "soc_analyst", "isActive": true }
}

// Response 409 — email duplicado
{ "error": "El correo electrónico ya está en uso" }
```

#### PUT /api/admin/users/:id (HU-008.2)
```json
// Request
{
  "fullName": "Ana Maria Torres",
  "role": "incident_handler"
}

// Response 200
{
  "success": true,
  "user": { ... },
  "audit": { "previousRole": "soc_analyst", "newRole": "incident_handler" }
}

// Response 400 — auto-cambio de rol
{ "error": "No puede modificar su propio rol" }
```

#### PATCH /api/admin/users/:id/status (HU-008.3)
```json
// Request
{ "isActive": false }

// Response 200
{
  "success": true,
  "user": { "id": "uuid", "isActive": false },
  "reassignedIncidents": 3
}

// Response 400 — auto-desactivación
{ "error": "No puede desactivar su propia cuenta" }
```

### Endpoints HU-001 — Incidentes

| Método | Ruta | Descripción | Auth | Rol |
|---|---|---|---|---|
| `POST` | `/api/incidents` | Crear incidente desde amenaza | JWT | admin, soc_analyst |
| `GET` | `/api/incidents` | Listar incidentes | JWT | todos los roles |
| `GET` | `/api/incidents/:id` | Detalle de incidente | JWT | todos los roles |

#### POST /api/incidents (HU-001)
```json
// Request
{
  "threatId": "uuid-de-la-amenaza"
}

// Response 201
{
  "success": true,
  "incident": { "id": "uuid", "threatId": "...", "status": "open", "severity": "high", ... }
}

// Response 400 — severidad insuficiente
{ "error": "Solo amenazas con severidad ALTA o CRÍTICA pueden generar incidentes" }

// Response 409 — incidente duplicado
{ "error": "Ya existe un incidente activo para esta amenaza" }
```

---

## 5. SPRINT BOARD — DÍA A DÍA

### Día 1 (Abril 1) — Planificación + Specs + Fundaciones

| # | Tarea | Rol | Entregable | Tiempo |
|---|---|---|---|---|
| 1.1 | Crear plan de implementación (este documento) | Arquitecto | `.github/IMPLEMENTATION_PLAN.md` | 2h |
| 1.2 | Generar spec ASDD para HU-008 (épica) | Spec Generator | `.github/specs/user-management.spec.md` | 1h |
| 1.3 | Generar spec ASDD para HU-001 | Spec Generator | `.github/specs/create-incident.spec.md` | 1h |
| 1.4 | Crear migración SQL `002_incidents_and_roles.sql` | DB Dev | `backend/producer/migrations/` | 30min |
| 1.5 | Crear rama `feature/irms-user-management` | DevOps | Git | 5min |
| 1.6 | Crear rama `feature/irms-create-incident` | DevOps | Git | 5min |

**Entregables día 1:** Plan aprobado, 2 specs en DRAFT→APPROVED, migración lista, ramas creadas.

---

### Día 2 (Abril 2) — Backend HU-008 (Épica completa)

| # | Tarea | Rol | Archivos | Tiempo |
|---|---|---|---|---|
| 2.1 | Crear value object `UserRole.ts` | Backend Dev | `domain/value-objects/UserRole.ts` | 30min |
| 2.2 | Extender port `UserRepository.ts` | Backend Dev | `domain/ports/UserRepository.ts` | 30min |
| 2.3 | Crear `CreateUserUseCase.ts` (HU-008.1) | Backend Dev | `application/use-cases/CreateUserUseCase.ts` | 1h |
| 2.4 | Crear `UpdateUserUseCase.ts` (HU-008.2) | Backend Dev | `application/use-cases/UpdateUserUseCase.ts` | 1h |
| 2.5 | Crear `ToggleUserStatusUseCase.ts` (HU-008.3) | Backend Dev | `application/use-cases/ToggleUserStatusUseCase.ts` | 1h |
| 2.6 | Extender `PostgresUserRepository.ts` | Backend Dev | `infrastructure/persistence/` | 1h |
| 2.7 | Extender `admin.controller.ts` con 5 endpoints | Backend Dev | `infrastructure/http/controllers/` | 1.5h |
| 2.8 | Crear schemas de validación Joi | Backend Dev | `infrastructure/http/validators/user.schema.ts` | 30min |
| 2.9 | Registrar en `ServiceFactory.ts` | Backend Dev | `infrastructure/factories/` | 15min |

**Commits día 2:**
```
feat(domain): add UserRole value object and extend UserRepository port
feat(application): add CreateUserUseCase for HU-008.1
feat(application): add UpdateUserUseCase for HU-008.2
feat(application): add ToggleUserStatusUseCase for HU-008.3
feat(infrastructure): extend PostgresUserRepository with new methods
feat(api): add CRUD user management endpoints to admin controller
```

---

### Día 3 (Abril 3) — Backend HU-001 + Tests Backend

| # | Tarea | Rol | Archivos | Tiempo |
|---|---|---|---|---|
| 3.1 | Crear entidad `Incident.ts` | Backend Dev | `domain/entities/Incident.ts` | 1h |
| 3.2 | Crear value object `IncidentStatus.ts` | Backend Dev | `domain/value-objects/IncidentStatus.ts` | 30min |
| 3.3 | Crear port `IncidentRepository.ts` | Backend Dev | `domain/ports/IncidentRepository.ts` | 30min |
| 3.4 | Crear `CreateIncidentUseCase.ts` | Backend Dev | `application/use-cases/CreateIncidentUseCase.ts` | 1h |
| 3.5 | Crear `PostgresIncidentRepository.ts` | Backend Dev | `infrastructure/persistence/` | 1h |
| 3.6 | Crear `incident.controller.ts` | Backend Dev | `infrastructure/http/controllers/` | 1h |
| 3.7 | Tests unitarios de `Incident.ts` (entidad) | Test Engineer | `__tests__/unit/domain/entities/` | 30min |
| 3.8 | Tests unitarios de `CreateIncidentUseCase.ts` | Test Engineer | `__tests__/unit/application/use-cases/` | 1h |
| 3.9 | Tests unitarios de `CreateUserUseCase.ts` | Test Engineer | `__tests__/unit/application/use-cases/` | 45min |
| 3.10 | Tests unitarios de `UpdateUserUseCase.ts` | Test Engineer | `__tests__/unit/application/use-cases/` | 45min |
| 3.11 | Tests unitarios de `ToggleUserStatusUseCase.ts` | Test Engineer | `__tests__/unit/application/use-cases/` | 45min |

**Commits día 3:**
```
feat(domain): add Incident entity with factory method
feat(domain): add IncidentStatus value object
feat(domain): add IncidentRepository port
feat(application): add CreateIncidentUseCase for HU-001
feat(infrastructure): add PostgresIncidentRepository
feat(api): add incident controller with POST and GET endpoints
test(domain): add Incident entity unit tests
test(application): add CreateIncidentUseCase unit tests
test(application): add user management use cases unit tests
```

---

### Día 4 (Abril 4) — Frontend (HU-008 + HU-001)

| # | Tarea | Rol | Archivos | Tiempo |
|---|---|---|---|---|
| 4.1 | Crear servicio `UserAdminService` (Angular) | Frontend Dev | `core/infrastructure/services/` | 1h |
| 4.2 | Crear componente `user-management/` | Frontend Dev | `presentation/components/user-management/` | 2h |
| 4.3 | Crear servicio `IncidentService` (Angular) | Frontend Dev | `core/infrastructure/services/` | 30min |
| 4.4 | Crear componente `incident-list/` | Frontend Dev | `presentation/components/incident-list/` | 1.5h |
| 4.5 | Agregar botón "Crear Incidente" en dashboard/threats | Frontend Dev | `presentation/components/dashboard/` | 30min |
| 4.6 | Registrar rutas nuevas en `app.routes.ts` | Frontend Dev | `app/app.routes.ts` | 15min |
| 4.7 | Crear componente `sidebar/` (HU-010 — menú desplegable) | Frontend Dev | `presentation/components/sidebar/` | 1h |
| 4.8 | Tests unitarios frontend (componentes) | Test Engineer | `src/__tests__/` o spec files | 1.5h |

**Commits día 4:**
```
feat(frontend): add UserAdminService for admin API calls
feat(frontend): add user-management component with CRUD UI
feat(frontend): add IncidentService and incident-list component
feat(frontend): add create-incident button in dashboard
feat(frontend): register new routes for users and incidents
feat(frontend): add collapsible sidebar menu with role-based visibility (HU-010)
test(frontend): add user-management, incident-list and sidebar component tests
```

---

### Día 5 (Abril 5) — QA Automation + Evidencia + Pulido

| # | Tarea | Rol | Entregable | Tiempo |
|---|---|---|---|---|
| 5.1 | Actualizar repo AUTO_FRONT_POM — implementar Pages de la Sección 8.2 | QA Automation | POM pages (`UserManagementPage`, `IncidentPage`, `SidebarPage`) | 1.5h |
| 5.2 | Actualizar repo AUTO_FRONT_SCREENPLAY — implementar Tasks de la Sección 8.3 | QA Automation | Tasks (`CreateUser`, `DeactivateUser`, `ChangeUserRole`, `CreateIncidentFromThreat`) | 1.5h |
| 5.3 | Actualizar repo AUTO_API_SCREENPLAY — implementar Gherkin de la Sección 8.4 | QA Automation | API tests screenplay (todos los endpoints de HU-008 + HU-001) | 1.5h |
| 5.4 | Ejecutar suite completa de tests, generar coverage report | QA | Coverage HTML + terminal output | 30min |
| 5.5 | Merge de ramas feature → develop (o PR) | DevOps | PR creado + aprobado | 30min |
| 5.6 | Crear documento de evidencia para sustentación | Documentación | `docs/SUSTENTACION_EVIDENCE.md` | 1h |
| 5.7 | Preparar demo: levantar entorno con docker-compose | DevOps | Entorno funcional | 30min |

---

## 6. ESTRATEGIA DE RAMAS Y COMMITS

### Modelo de branching

```
main
 └── develop
      ├── feature/irms-user-management    ← HU-008 (épica: 008.1, 008.2, 008.3)
      └── feature/irms-create-incident    ← HU-001
```

### Convención de commits (Conventional Commits)

```
<tipo>(alcance): descripción corta

feat(domain): add Incident entity with factory method
feat(api): add POST /api/incidents endpoint
fix(auth): prevent admin self-deactivation
test(unit): add CreateUserUseCase happy path and error tests
docs(spec): generate user-management spec ASDD
chore(db): add migration 002 for incidents and roles
```

### Flujo Git por día

| Día | Rama activa | Merge a |
|---|---|---|
| 1 | `develop` | — (solo specs y plan) |
| 2 | `feature/irms-user-management` | — |
| 3 | `feature/irms-create-incident` + continuar user-mgmt tests | — |
| 4 | frontend en ambas ramas (o rama unificada) | — |
| 5 | `feature/*` → `develop` vía PR | `develop` |

---

## 7. ESTRATEGIA DE TESTING

### Pirámide de tests

```
           /  E2E (QA repos)  \        ← 3 repos externos
          / Integration (Jest) \       ← controller + DB mock
         / Unit Tests (Jest)    \      ← use cases + entities + value objects
        /________________________\
```

### Tests unitarios backend (Jest + ts-jest)

| Archivo bajo test | Archivo de test | Qué cubre |
|---|---|---|
| `Incident.ts` (entidad) | `unit/domain/entities/Incident.test.ts` | factory method, validaciones, `isHighSeverity()` |
| `IncidentStatus.ts` (VO) | `unit/domain/value-objects/IncidentStatus.test.ts` | valores válidos, transiciones iniciales |
| `CreateIncidentUseCase.ts` | `unit/application/use-cases/CreateIncidentUseCase.test.ts` | happy path, amenaza no encontrada, severidad baja, duplicado |
| `CreateUserUseCase.ts` | `unit/application/use-cases/CreateUserUseCase.test.ts` | happy path, email duplicado, validación campos |
| `UpdateUserUseCase.ts` | `unit/application/use-cases/UpdateUserUseCase.test.ts` | happy path, auto-cambio rol, usuario no encontrado |
| `ToggleUserStatusUseCase.ts` | `unit/application/use-cases/ToggleUserStatusUseCase.test.ts` | desactivar, reactivar, auto-desactivación, incidentes reasignados |

### Patrón de mocking

```typescript
// GIVEN — port mockeado
const mockUserRepo: jest.Mocked<UserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  // ...
};

// WHEN — ejecutar use case
const useCase = new CreateUserUseCase(mockUserRepo, mockAuditRepo);
const result = await useCase.execute({ email: 'a@b.com', fullName: 'Test', role: 'soc_analyst' });

// THEN — verificar resultado y side effects
expect(result.user.email).toBe('a@b.com');
expect(mockAuditRepo.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER_CREATED' }));
```

### Tests frontend (Vitest + Testing Library o Angular TestBed)

| Componente | Qué cubre |
|---|---|
| `UserManagementComponent` | Render de tabla, formulario crear usuario, validaciones |
| `IncidentListComponent` | Render de lista, botón crear incidente, filtros |

### Cobertura objetivo

- **Backend:** ≥ 80% (rúbrica pide "alta cobertura lógica")
- **Frontend:** ≥ 70%
- **Foco:** Use cases (100% cobertura lógica) > Entidades > Controllers

---

## 8. ESTRATEGIA QA AUTOMATION (3 REPOS EXTERNOS)

> Los escenarios Gherkin de esta sección son la **fuente de verdad** para los 3 repositorios de automatización. Cada escenario mapea 1:1 a un test de Selenium o a una API call en Screenplay.

### 8.1 GHERKIN — Escenarios por HU

---

#### HU-008.1 — Creación de Usuarios

```gherkin
Feature: Creación de usuarios por Administrador
  Background:
    Given el sistema está corriendo en http://localhost:4200
    And existo como administrador autenticado con usuario "admin" y contraseña válida

  Scenario: Creación exitosa de un nuevo usuario analista SOC
    Given estoy en la pantalla "Gestión de Usuarios"
    When hago clic en el botón "Crear Usuario"
    And ingreso el nombre completo "Ana Torres"
    And ingreso el correo "ana.torres@cyberguard.com"
    And ingreso el usuario "ana.torres"
    And selecciono el rol "Analista SOC"
    And hago clic en "Confirmar"
    Then veo al usuario "Ana Torres" en la tabla de usuarios
    And el estado del usuario es "Activo"
    And el rol mostrado es "Analista SOC"

  Scenario: Rechazo de correo electrónico duplicado
    Given existe un usuario con correo "ana.torres@cyberguard.com"
    When intento crear un usuario con el mismo correo "ana.torres@cyberguard.com"
    Then el sistema muestra el mensaje "El correo electrónico ya está en uso"
    And no se crea ningún registro nuevo en la tabla

  Scenario: Validación de campo obligatorio "Nombre completo"
    Given estoy en el formulario "Crear Usuario"
    When dejo vacío el campo "Nombre completo"
    And hago clic en "Confirmar"
    Then veo el mensaje de validación "El nombre completo es obligatorio"
    And el formulario no se envía al servidor

  Scenario: Validación de selección de rol obligatorio
    Given estoy en el formulario "Crear Usuario"
    When lleno todos los campos pero no selecciono ningún rol
    And hago clic en "Confirmar"
    Then veo un mensaje de error indicando que el rol es obligatorio
```

---

#### HU-008.2 — Modificación de Usuarios

```gherkin
Feature: Modificación de usuarios por Administrador

  Scenario: Actualización exitosa del nombre completo
    Given existe el usuario "Ana Torres" con rol "Analista SOC"
    And estoy en la pantalla "Gestión de Usuarios"
    When hago clic en "Editar" para el usuario "Ana Torres"
    And cambio el campo "Nombre completo" a "Ana Maria Torres"
    And hago clic en "Guardar"
    Then el nombre del usuario en la tabla es "Ana Maria Torres"
    And el sistema muestra un mensaje de éxito

  Scenario: Cambio de rol con trazabilidad en auditoría
    Given existe el usuario "Ana Torres" con rol "Analista SOC"
    When accedo a la edición del usuario "Ana Torres"
    And cambio el rol a "Incident Handler"
    And hago clic en "Guardar"
    Then el rol del usuario en la tabla es "Incident Handler"

  Scenario: Prevención de auto-modificación de rol
    Given estoy autenticado como el administrador "admin"
    When intento editar mi propia cuenta
    And cambio mi rol a "Analista SOC"
    And hago clic en "Guardar"
    Then el sistema muestra el mensaje "No puede modificar su propio rol"
    And mi rol sigue siendo "Administrador"

  Scenario: Campo email mostrado como solo lectura en edición
    Given estoy en el formulario de edición del usuario "Ana Torres"
    Then el campo "Correo electrónico" está deshabilitado y no admite escritura
```

---

#### HU-008.3 — Desactivación y Reactivación de Usuarios

```gherkin
Feature: Desactivación y reactivación de usuarios

  Scenario: Desactivación exitosa de un usuario activo
    Given existe el usuario activo "Ana Torres"
    And estoy en la pantalla "Gestión de Usuarios"
    When hago clic en el botón de "Desactivar" para el usuario "Ana Torres"
    Then el estado del usuario "Ana Torres" en la tabla cambia a "Inactivo"
    And el botón de la fila pasa a decir "Activar"

  Scenario: Reactivación de un usuario previamente desactivado
    Given existe el usuario inactivo "Ana Torres"
    And estoy en la pantalla "Gestión de Usuarios"
    When hago clic en el botón "Activar" para el usuario "Ana Torres"
    Then el estado del usuario "Ana Torres" cambia a "Activo"

  Scenario: Prevención de auto-desactivación
    Given estoy autenticado como el administrador "admin"
    When intento desactivar mi propia fila en la tabla de usuarios
    Then el botón de desactivación está deshabilitado para mi propia fila
    O el sistema muestra el mensaje "No puede desactivar su propia cuenta"
    And mi cuenta sigue activa

  Scenario: Indicador visual "Tu cuenta" en fila propia
    Given estoy autenticado como el administrador "admin"
    When estoy en la pantalla "Gestión de Usuarios"
    Then la fila del usuario "admin" muestra un badge "Tu cuenta"
    And los botones de Editar y Desactivar están ocultos o deshabilitados en esa fila
```

---

#### HU-001 — Crear Incidente desde Amenaza

```gherkin
Feature: Creación de incidente desde una amenaza

  Background:
    Given el sistema está corriendo en http://localhost:4200
    And existo como analista SOC autenticado
    And estoy en la pantalla "Incidentes"

  Scenario: Creación exitosa de incidente desde amenaza crítica
    Given existe una amenaza con severidad "critical" e ID visible en el Dashboard
    When ingreso el UUID de esa amenaza en el campo "ID de la Amenaza"
    And hago clic en "Crear Incidente"
    Then un nuevo incidente aparece en la lista con estado "Abierto"
    And el incidente muestra la severidad "Crítica"
    And el incidente muestra el tipo de amenaza y la IP de origen

  Scenario: Rechazo de amenaza con severidad baja
    Given existe una amenaza con severidad "low"
    When ingreso su ID en el campo "ID de la Amenaza"
    And hago clic en "Crear Incidente"
    Then el sistema muestra el mensaje "Solo amenazas de severidad alta o crítica pueden generar incidentes"
    And no se agrega ningún incidente a la lista

  Scenario: Rechazo de incidente duplicado
    Given existe una amenaza con severidad "high" que ya tiene un incidente activo
    When ingreso su ID en el campo "ID de la Amenaza"
    And hago clic en "Crear Incidente"
    Then el sistema muestra el mensaje "Ya existe un incidente activo para esta amenaza"

  Scenario: Amenaza no encontrada por ID incorrecto
    Given no existe ninguna amenaza con el ID ingresado
    When ingreso un UUID inválido "00000000-0000-0000-0000-000000000000"
    And hago clic en "Crear Incidente"
    Then el sistema muestra el mensaje "Amenaza no encontrada"

  Scenario: Usuario con rol sin permisos no puede crear incidente
    Given estoy autenticado con rol "ciso"
    When navego a la pantalla "Incidentes"
    Then el formulario de creación de incidente no está visible
    O el botón "Crear Incidente" está deshabilitado
```

---

#### HU-010 — Menú Lateral Desplegable

```gherkin
Feature: Menú lateral desplegable con navegación por roles

  Background:
    Given el sistema está corriendo en http://localhost:4200
    And existo como usuario autenticado

  Scenario: Menú visible en todas las rutas protegidas
    Given he iniciado sesión exitosamente
    When navego a cualquier ruta protegida (dashboard, incidentes, report-threat)
    Then el menú lateral es visible en el lado izquierdo de la pantalla

  Scenario: Sección "Gestión de Usuarios" solo visible para admins
    Given estoy autenticado con rol "admin"
    Then el menú lateral muestra la opción "Gestión de Usuarios"

  Scenario: Sección "Gestión de Usuarios" oculta para roles no-admin
    Given estoy autenticado con rol "soc_analyst"
    Then el menú lateral NO muestra la opción "Gestión de Usuarios"

  Scenario: Menú puede colapsar y expandir
    Given el menú lateral está expandido
    When hago clic en el botón de colapso
    Then el menú se contrae mostrando solo íconos
    And al hacer clic en el botón de expansión el menú muestra etiquetas nuevamente

  Scenario: Estado de colapso persiste entre recargas
    Given colapsé el menú lateral
    When recargo la página
    Then el menú sigue colapsado

  Scenario: Ruta activa resaltada visualmente
    Given estoy en la ruta "/dashboard"
    Then la opción "Dashboard" del menú lateral tiene un estilo visual diferenciado
```

---

### 8.2 AUTO_FRONT_POM — Page Object Model

Los siguientes Page Objects implementan los escenarios Gherkin de la sección 8.1:

| Page Object | Método | Descripción |
|---|---|---|
| `UserManagementPage` | `clickCreateUser()` | Click en botón "Crear Usuario" |
| `UserManagementPage` | `fillUserForm(name, email, username, role)` | Llenar todos los campos del formulario |
| `UserManagementPage` | `submitForm()` | Click en "Confirmar" |
| `UserManagementPage` | `getUserRowByName(name)` | Obtener fila de tabla por nombre |
| `UserManagementPage` | `clickEdit(username)` | Click en Editar para usuario específico |
| `UserManagementPage` | `clickToggleStatus(username)` | Click en Activar / Desactivar |
| `UserManagementPage` | `getStatusBadge(username)` | Obtener texto del badge Activo / Inactivo |
| `UserManagementPage` | `isOwnRowProtected()` | Verificar botones ocultos en la fila propia |
| `IncidentPage` | `enterThreatId(id)` | Ingresar UUID en el campo de amenaza |
| `IncidentPage` | `clickCreateIncident()` | Click en "Crear Incidente" |
| `IncidentPage` | `getIncidentCount()` | Contar filas en la tabla de incidentes |
| `IncidentPage` | `verifyIncidentStatus(id, status)` | Validar estado de incidente creado |
| `SidebarPage` | `clickCollapse()` | Colapsar el menú lateral |
| `SidebarPage` | `clickExpand()` | Expandir el menú lateral |
| `SidebarPage` | `isMenuItemVisible(label)` | Verificar visibilidad de opción del menú |
| `SidebarPage` | `getActiveRoute()` | Obtener el ítem de menú activo |
| `LoginPage` | (ya existe) | Login con email y contraseña |

---

### 8.3 AUTO_FRONT_SCREENPLAY — Screenplay Pattern

| Task | Interactions compuestas | Escenario Gherkin |
|---|---|---|
| `CreateUser` | `Enters.the(fullName).into(UserForm.FULL_NAME)` + `Selects.the(role).from(UserForm.ROLE)` + `Clicks.on(UserForm.SUBMIT)` | HU-008.1 happy path |
| `DeactivateUser` | `Clicks.on(UserTable.TOGGLE_STATUS(username))` | HU-008.3 desactivar |
| `ReactivateUser` | `Clicks.on(UserTable.TOGGLE_STATUS(username))` | HU-008.3 reactivar |
| `ChangeUserRole` | `Clicks.on(UserTable.EDIT(username))` + `Selects.the(newRole).from(EditForm.ROLE)` + `Clicks.on(EditForm.SAVE)` | HU-008.2 cambio de rol |
| `CreateIncidentFromThreat` | `Navigates.to(Routes.INCIDENTS)` + `Enters.the(threatId).into(IncidentForm.THREAT_ID)` + `Clicks.on(IncidentForm.CREATE)` | HU-001 happy path |
| `CollapseMenu` | `Clicks.on(Sidebar.COLLAPSE_BUTTON)` | HU-010 colapso |
| `VerifyErrorMessage` | `Ensure.that(ErrorMessage.TEXT, equals(expectedMsg))` | Todos los escenarios de error |
| `VerifyMenuItemVisibility` | `Ensure.that(Sidebar.ITEM(label), isDisplayed())` | HU-010 visibilidad por rol |

---

### 8.4 AUTO_API_SCREENPLAY — API Screenplay (Gherkin + Payloads)

> Base URL: `http://localhost:3000`
>
> Tokens de prueba: `admin_token` = JWT `{ id: 'admin-uid', username: 'admin', role: 'admin' }`

---

#### HU-008.1 API — POST /api/admin/users

```gherkin
Feature: API - Crear usuario via POST /api/admin/users

  Scenario: Creación exitosa
    Given el header Authorization contiene un admin_token válido
    When envío POST a "/api/admin/users" con body:
      """
      {
        "email": "test.user@cyberguard.com",
        "fullName": "Test User",
        "username": "test.user",
        "role": "soc_analyst"
      }
      """
    Then la respuesta tiene status 201
    And el body contiene "success: true"
    And el body contiene "user.email: test.user@cyberguard.com"
    And el body contiene "user.isActive: true"

  Scenario: Email duplicado retorna 409
    Given existe un usuario con email "test.user@cyberguard.com"
    When envío POST a "/api/admin/users" con el mismo email
    Then la respuesta tiene status 409
    And el body contiene "El correo electrónico ya está en uso"

  Scenario: Sin autenticación retorna 401
    Given no incluyo header Authorization
    When envío POST a "/api/admin/users" con datos válidos
    Then la respuesta tiene status 401

  Scenario: Rol inválido retorna 400
    Given el header Authorization contiene un admin_token válido
    When envío POST a "/api/admin/users" con "role: superadmin" (rol inválido)
    Then la respuesta tiene status 400
    And el body contiene un mensaje de validación de roles
```

---

#### HU-008.2 API — PUT /api/admin/users/:id

```gherkin
Feature: API - Modificar usuario via PUT /api/admin/users/:id

  Scenario: Modificación exitosa de nombre y rol
    Given existe un usuario con id "user-uuid-123"
    And el header Authorization contiene un admin_token válido
    When envío PUT a "/api/admin/users/user-uuid-123" con:
      """
      { "fullName": "Nuevo Nombre", "role": "incident_handler" }
      """
    Then la respuesta tiene status 200
    And el body contiene "user.fullName: Nuevo Nombre"
    And el body contiene "user.role: incident_handler"

  Scenario: Auto-cambio de rol rechazado con 400
    Given estoy autenticado como el administrador con id "admin-uid"
    When envío PUT a "/api/admin/users/admin-uid" con "role: soc_analyst"
    Then la respuesta tiene status 400
    And el body contiene "SelfModificationForbiddenError"

  Scenario: Usuario no encontrado retorna 404
    When envío PUT a "/api/admin/users/no-existe-uuid" con datos válidos
    Then la respuesta tiene status 404
```

---

#### HU-008.3 API — PATCH /api/admin/users/:id/status

```gherkin
Feature: API - Desactivar/reactivar usuario via PATCH /api/admin/users/:id/status

  Scenario: Desactivación exitosa
    Given existe un usuario activo con id "user-uuid-123"
    And el header Authorization contiene un admin_token válido
    When envío PATCH a "/api/admin/users/user-uuid-123/status" con:
      """
      { "isActive": false }
      """
    Then la respuesta tiene status 200
    And el body contiene "user.isActive: false"

  Scenario: Reactivación exitosa
    Given existe un usuario inactivo con id "user-uuid-123"
    When envío PATCH a "/api/admin/users/user-uuid-123/status" con "isActive: true"
    Then la respuesta tiene status 200
    And el body contiene "user.isActive: true"

  Scenario: Auto-desactivación rechazada con 400
    Given estoy autenticado como el administrador con id "admin-uid"
    When envío PATCH a "/api/admin/users/admin-uid/status" con "isActive: false"
    Then la respuesta tiene status 400
    And el body contiene "SelfModificationForbiddenError"
```

---

#### HU-001 API — POST /api/incidents

```gherkin
Feature: API - Crear incidente via POST /api/incidents

  Scenario: Creación exitosa desde amenaza crítica
    Given existe una amenaza con event_id "threat-uuid-high" y severidad "critical"
    And el header Authorization contiene un token de rol "admin"
    When envío POST a "/api/incidents" con body:
      """
      { "threatId": "threat-uuid-high" }
      """
    Then la respuesta tiene status 201
    And el body contiene "incident.status: open"
    And el body contiene "incident.severity: critical"
    And el body contiene "incident.threatId: threat-uuid-high"

  Scenario: Amenaza con severidad baja retorna 400
    Given existe una amenaza con event_id "threat-uuid-low" y severidad "low"
    When envío POST a "/api/incidents" con "threatId: threat-uuid-low"
    Then la respuesta tiene status 400
    And el body contiene "InvalidIncidentCreationError"

  Scenario: Incidente duplicado retorna 409
    Given existe una amenaza "threat-uuid-high" con incidente activo ya creado
    When envío POST a "/api/incidents" con "threatId: threat-uuid-high" nuevamente
    Then la respuesta tiene status 409
    And el body contiene "DuplicateIncidentError"

  Scenario: Amenaza no encontrada retorna 404
    When envío POST a "/api/incidents" con "threatId: ghost-uuid-999"
    Then la respuesta tiene status 404
    And el body contiene "ThreatNotFoundForIncidentError"

  Scenario: Sin autenticación retorna 401
    Given no incluyo header Authorization
    When envío POST a "/api/incidents" con un threatId válido
    Then la respuesta tiene status 401
```

---

#### HU-001 API — GET /api/incidents

```gherkin
Feature: API - Listar incidentes via GET /api/incidents

  Scenario: Listar incidentes con token válido
    Given el header Authorization contiene un token válido de cualquier rol
    When envío GET a "/api/incidents"
    Then la respuesta tiene status 200
    And el body contiene un array "incidents"

  Scenario: Sin autenticación retorna 401
    Given no incluyo header Authorization
    When envío GET a "/api/incidents"
    Then la respuesta tiene status 401
```

---

---

## 9. EVIDENCIA PARA SUSTENTACIÓN (20 min)

### Auditoría de Implementación (7 min)

| Qué mostrar | Cómo defenderlo |
|---|---|
| Estructura de carpetas Hexagonal | "Seguí domain/ports → application/use-cases → infrastructure/persistence. NO hay imports invertidos." |
| `Incident.ts` (entidad de dominio) | "La entidad valida reglas de negocio en el factory method. No depende de infraestructura." |
| Use cases con dependency injection via ports | "Los use cases reciben interfaces (ports), no implementaciones concretas. Esto permite mock perfecto en tests." |
| Prueba de fuego: mock de `UserRepository` | "En los tests, el repo es un mock. Si cambio la DB mañana, los tests de negocio NO se rompen." |

### Demostración de Calidad Automatizada (7 min)

| Qué mostrar | Cómo defenderlo |
|---|---|
| Coverage report ≥ 80% | "Cubren happy path, error path y edge cases. Las pruebas documentan el comportamiento esperado." |
| Test suite corriendo en verde | Ejecutar `npm test` en vivo. |
| POM pages reutilizables | "Una page por pantalla. `UserManagementPage` se usa en 4 tests diferentes." |
| Screenplay API con payloads parametrizados | "Los datos están desacoplados del código. Cambiar un payload no requiere cambiar el Task." |

### Defensa Simbiosis Humano-IA (6 min)

| Punto de defensa | Ejemplo concreto |
|---|---|
| Decisión arquitectónica propia | "La IA sugirió crear un servicio `IncidentService` en la capa de aplicación. Yo decidí usar un UseCase puro porque mantiene SRP y es consistente con el patrón existente (`ListThreatsUseCase`)." |
| Corrección de código IA | "La IA generó el endpoint sin validar duplicados de incidente. Yo agregué la constraint UNIQUE condicional en la migración + validación en el use case." |
| Filtrado de sugerencias | "Rechacé la sugerencia de usar un ORM completo (TypeORM). El proyecto usa queries directas con `pg` y mantenerlo así evita una migración riesgosa de 0 valor en 5 días." |
| Dominio RBAC propio | "Diseñé la tabla de roles IRMS basándome en la Guía MinTIC No. 21, no en una sugerencia genérica de la IA." |

---

## 10. RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| No completar HU-001 frontend | Media | Alto | Priorizar backend completo + tests. Frontend mínimo viable (botón + lista). |
| Tests de integración fallan por DB | Media | Medio | Usar mocks en unit tests. Solo 1-2 integration tests con testcontainers si alcanza el tiempo. |
| QA repos tardan más de lo estimado | Alta | Medio | Plantillas de Screenplay ya tienen estructura. Solo agregar Tasks y Pages nuevos. |
| Migración SQL rompe datos existentes | Baja | Alto | ADD COLUMN IF NOT EXISTS + DEFAULT values. Nunca DROP ni ALTER tipo. |
| Roles existentes dejan de funcionar | Baja | Crítico | Migración incluye UPDATE de roles legacy → nuevos. Login existente sigue operativo. |
| Preguntan por HU-009 en sustentación | Media | Medio | ADR-006 documentado: RBAC estático cumple la misma matriz del RFC. Siguiente sprint path definido en §0.6. |

---

## 11. DEFINICIÓN DE DONE (DoD) POR HU

### HU-008.1 — Creación de Usuarios ✅ cuando:
- [ ] Endpoint `POST /api/admin/users` funcional
- [ ] Validación Joi: email, fullName, role obligatorios
- [ ] Rechaza email duplicado con HTTP 409
- [ ] Registra acción en `audit_logs`
- [ ] UI: formulario de creación con validaciones
- [ ] ≥ 3 unit tests (happy + duplicate + validation)
- [ ] Commit con conventional commits
- [ ] **NOTA Firebase (deuda documentada):** El usuario se guarda en PostgreSQL. Para que pueda hacer login, debe existir también en Firebase Auth (creado manualmente en Firebase Console con el mismo email). `FirebaseAuthProvider.createUser()` está pendiente de implementar con Firebase Admin SDK.

### HU-008.2 — Modificación de Usuarios ✅ cuando:
- [ ] Endpoint `PUT /api/admin/users/:id` funcional
- [ ] Email es readonly (no se modifica)
- [ ] Impide auto-cambio de rol con HTTP 400
- [ ] Audit log registra valor anterior y nuevo del rol
- [ ] UI: formulario de edición con campo email disabled
- [ ] ≥ 3 unit tests (happy + self-change + not-found)

### HU-008.3 — Desactivación/Reactivación ✅ cuando:
- [ ] Endpoint `PATCH /api/admin/users/:id/status` funcional
- [ ] Impide auto-desactivación con HTTP 400
- [ ] Al desactivar: marca incidentes del usuario como "no asignados"
- [ ] Audit log registra quién desactivó/reactivó
- [ ] UI: toggle de estado con confirmación
- [ ] ≥ 3 unit tests (deactivate + reactivate + self-deactivation)

### HU-001 — Crear Incidente desde Amenaza ✅ cuando:
- [ ] Endpoint `POST /api/incidents` funcional
- [ ] Solo acepta amenazas con severidad `high` o `critical`
- [ ] Rechaza duplicados (amenaza ya tiene incidente activo)
- [ ] Incidente hereda datos de la amenaza (sourceIp, type, severity, description)
- [ ] UI: formulario para crear incidente ingresando el UUID de la amenaza (flujo semi-manual)
- [ ] UI: lista de incidentes con estado y severidad
- [ ] ≥ 4 unit tests (happy + low-severity + duplicate + threat-not-found)
- [ ] **NOTA de alcance:** El RFC dice "automáticamente". La impl es semi-manual por alcance de sprint: el analista copia el UUID del dashboard y hace POST. El flujo automático completo requeriría un consumer RabbitMQ (fuera de alcance). Esto debe mencionarse explícitamente en la sustentación como decisión de alcance.

### HU-010 — Menú Lateral Desplegable ✅ cuando:
- [ ] Menú lateral visible en todas las rutas protegidas (post-login)
- [ ] Sección "Gestión de Usuarios" solo visible para rol `admin`
- [ ] Puede colapsar/expandir (botón toggle o hover)
- [ ] Estado de colapso persiste en `localStorage`
- [ ] Ruta activa resaltada visualmente
- [ ] ≥ 2 unit tests (render con admin, render con rol no-admin)
- [ ] Commit con conventional commits

---

## 12. CHECKLIST PRE-SUSTENTACIÓN

- [ ] Todos los tests en verde (`npm test` en producer)
- [ ] Coverage report generado y ≥ 80%
- [ ] Docker-compose levanta sin errores
- [ ] Flujo completo demostrable: login → menú lateral → crear usuario → crear amenaza → crear incidente
- [ ] HU-010: menú lateral colapsable funcionando con visibilidad por rol
- [ ] 3 repos QA actualizados con Gherkin de la Sección 8 implementados
- [ ] PR creado (o mergeado) de las ramas feature → develop
- [ ] Este documento como referencia de decisiones
- [ ] Specs ASDD en `.github/specs/` con status APPROVED
- [ ] GAP Firebase documentado y preparado para defender en sustentación (ver Sección 0.5)

---

> **Siguiente paso:** Aprobar este plan → Generar las 2 specs ASDD (HU-008 y HU-001) → Comenzar con Día 2 (implementación backend).
