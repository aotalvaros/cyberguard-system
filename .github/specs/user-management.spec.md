---
id: SPEC-001
status: APPROVED
feature: user-management
created: 2026-04-01
updated: 2026-04-01
author: spec-generator
version: "1.0"
related-specs: [SPEC-002]
---

# Spec: Gestión de Usuarios del IRMS (HU-008 Épica)

> **Estado:** `APPROVED` — listo para implementar.
> **Ciclo de vida:** DRAFT → **APPROVED** → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
El módulo de gestión de usuarios permite al Administrador del sistema crear cuentas nuevas con rol asignado, modificar el nombre y el rol de usuarios existentes, y desactivar/reactivar cuentas de forma segura sin eliminar datos. Toda acción queda auditada en la tabla `audit_logs`.

### Requerimiento de Negocio
> **RF-007 | Gestionar usuarios y roles:** El sistema debe permitir al Administrador crear usuarios, asignar roles (SOC / Handler / Manager / CISO / Admin) y revocar accesos.

---

### Historias de Usuario

#### HU-008.1: Creación de Usuarios

```
Como:        Administrador del sistema
Quiero:      Crear un nuevo usuario proporcionando nombre completo, email y rol
Para:        Dar acceso controlado a nuevos miembros del equipo de respuesta ante incidentes

Prioridad:   Alta
Estimación:  M
Dependencias: Ninguna
Capa:        Backend + Frontend
```

#### Criterios de Aceptación — HU-008.1

**Happy Path**
```gherkin
CRITERIO-1.1: Creación exitosa de usuario
  Dado que:  Un Administrador autenticado envía datos válidos (fullName, email único, role válido)
  Cuando:    Hace POST /api/admin/users
  Entonces:  El sistema crea el usuario con isActive=true
             Y retorna HTTP 201 con los datos del usuario creado
             Y registra la acción en audit_logs con action='USER_CREATED'
```

**Error Path**
```gherkin
CRITERIO-1.2: Rechazo por email duplicado
  Dado que:  El email "ana.torres@example.com" ya existe en la base de datos
  Cuando:    El Administrador intenta crear un usuario con ese mismo email
  Entonces:  El sistema retorna HTTP 409
             Y el mensaje de error es "El correo electrónico ya está en uso"
             Y no se crea ningún registro en la BD

CRITERIO-1.3: Validación de campos obligatorios
  Dado que:  El Administrador envía el body sin el campo "fullName"
  Cuando:    Hace POST /api/admin/users
  Entonces:  El sistema retorna HTTP 400 con mensaje descriptivo del campo faltante
             Y no se crea ningún registro en la BD

CRITERIO-1.4: Rechazo por rol inválido
  Dado que:  El Administrador envía role="superuser" (no existe en el sistema)
  Cuando:    Hace POST /api/admin/users
  Entonces:  El sistema retorna HTTP 400 con mensaje "Rol no válido"
```

**Edge Case**
```gherkin
CRITERIO-1.5: Acceso denegado a no-administradores
  Dado que:  Un usuario con rol "soc_analyst" tiene JWT válido
  Cuando:    Intenta hacer POST /api/admin/users
  Entonces:  El sistema retorna HTTP 403 "Forbidden: admin role required"
```

---

#### HU-008.2: Modificación de Usuarios

```
Como:        Administrador del sistema
Quiero:      Modificar el nombre completo y el rol de un usuario existente
Para:        Mantener la información actualizada y ajustar permisos sin perder trazabilidad

Prioridad:   Alta
Estimación:  M
Dependencias: HU-008.1 (usuario debe existir)
Capa:        Backend + Frontend
```

#### Criterios de Aceptación — HU-008.2

**Happy Path**
```gherkin
CRITERIO-2.1: Actualización exitosa de perfil
  Dado que:  Existe un usuario con id="uuid-abc" y nombre "Ana Torres"
  Cuando:    El Administrador hace PUT /api/admin/users/uuid-abc con fullName="Ana Maria Torres"
  Entonces:  El sistema persiste el cambio
             Y retorna HTTP 200 con los datos actualizados
             Y registra en audit_logs el cambio con previousName y newName

CRITERIO-2.2: Cambio de rol con trazabilidad forense
  Dado que:  Existe un usuario con role="soc_analyst"
  Cuando:    El Administrador cambia su rol a "incident_handler"
  Entonces:  El sistema actualiza el rol
             Y en audit_logs registra: previousRole="soc_analyst", newRole="incident_handler"
             Y el changedBy es el id del Administrador que realizó el cambio
```

**Error Path**
```gherkin
CRITERIO-2.3: Prevención de auto-cambio de rol
  Dado que:  El Administrador autenticado tiene id="uuid-admin"
  Cuando:    Hace PUT /api/admin/users/uuid-admin con role="soc_analyst"
  Entonces:  El sistema retorna HTTP 400
             Y el mensaje es "No puede modificar su propio rol"
             Y el rol NO cambia en la BD

CRITERIO-2.4: Usuario no encontrado
  Dado que:  No existe ningún usuario con id="uuid-inexistente"
  Cuando:    El Administrador hace PUT /api/admin/users/uuid-inexistente
  Entonces:  El sistema retorna HTTP 404 "User not found"
```

**Edge Case**
```gherkin
CRITERIO-2.5: Email es inmutable
  Dado que:  El Administrador envía el body con campo "email" modificado
  Cuando:    Hace PUT /api/admin/users/:id
  Entonces:  El sistema ignora el campo email del body
             Y NO modifica el email en la BD
             Y retorna HTTP 200 con los demás cambios aplicados
```

---

#### HU-008.3: Desactivación y Reactivación de Usuarios

```
Como:        Administrador del sistema
Quiero:      Desactivar temporalmente una cuenta y reactivarla cuando sea necesario
Para:        Gestionar el acceso de forma segura sin perder el historial del usuario

Prioridad:   Alta
Estimación:  M
Dependencias: HU-008.1 (usuario debe existir), SPEC-002 (incidentes para reasignación)
Capa:        Backend + Frontend
```

#### Criterios de Aceptación — HU-008.3

**Happy Path**
```gherkin
CRITERIO-3.1: Desactivación exitosa con reasignación de incidentes
  Dado que:  Existe un usuario activo con 2 incidentes asignados (status != 'closed')
  Cuando:    El Administrador hace PATCH /api/admin/users/:id/status con isActive=false
  Entonces:  El usuario queda con isActive=false
             Y los 2 incidentes quedan con assigned_to=null (estado "Sin asignar")
             Y retorna HTTP 200 con reassignedIncidents=2
             Y registra en audit_logs action='USER_DEACTIVATED', deactivatedBy=<adminId>

CRITERIO-3.2: Reactivación exitosa con registro de auditoría
  Dado que:  Existe un usuario con isActive=false
  Cuando:    El Administrador hace PATCH /api/admin/users/:id/status con isActive=true
  Entonces:  El usuario queda con isActive=true
             Y retorna HTTP 200
             Y registra en audit_logs action='USER_REACTIVATED', reactivatedBy=<adminId>
```

**Error Path**
```gherkin
CRITERIO-3.3: Prevención de auto-desactivación
  Dado que:  El Administrador autenticado tiene id="uuid-admin"
  Cuando:    Hace PATCH /api/admin/users/uuid-admin/status con isActive=false
  Entonces:  El sistema retorna HTTP 400
             Y el mensaje es "No puede desactivar su propia cuenta"
             Y isActive NO cambia en la BD

CRITERIO-3.4: Usuario ya en el estado solicitado
  Dado que:  Existe un usuario con isActive=false
  Cuando:    El Administrador hace PATCH /api/admin/users/:id/status con isActive=false
  Entonces:  El sistema retorna HTTP 200 (idempotente)
             Y no registra entrada duplicada en audit_logs
```

---

### Reglas de Negocio

1. Solo el rol `admin` puede ejecutar cualquier operación de este módulo.
2. Los roles válidos son exactamente: `admin`, `soc_analyst`, `incident_handler`, `incident_manager`, `ciso`.
3. Un Administrador no puede modificar ni desactivar su propia cuenta.
4. El email de un usuario es inmutable una vez creado; se muestra como readonly en la UI.
5. La desactivación no elimina datos; solo bloquea autenticación vía `isActive=false`.
6. Al desactivar un usuario, sus incidentes activos (status != 'closed') se marcan como `assigned_to = null`.
7. Todo cambio de datos de usuario (creación, modificación, toggle de estado) genera una entrada en `audit_logs`.
8. El nombre completo (`fullName`) es obligatorio y no puede estar vacío.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas

| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `users` | PostgreSQL | modificada | Agregar columnas `full_name` e `is_active` |
| `audit_logs` | PostgreSQL | sin cambio de schema | Nuevas entradas de auditoría |

#### Migración requerida: `002_incidents_and_roles.sql`

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
```

> La tabla `incidents` se crea en SPEC-002. Esta migración convive en el mismo archivo.

#### UserRecord (domain port — cambios)

| Campo | Tipo | Obligatorio | Validación | Estado |
|-------|------|-------------|------------|--------|
| `id` | UUID | sí | auto-generado | existente |
| `username` | string | sí | unique, max 255 | existente |
| `email` | string | sí | email format, unique | existente |
| `role` | UserRole | sí | enum 5 valores | ampliado |
| `fullName` | string | no | max 255 | **nuevo** |
| `isActive` | boolean | sí | default true | **nuevo** |
| `isLocked` | boolean | sí | brute-force lock | existente |
| `failedAttempts` | number | sí | default 0 | existente |
| `lastLogin` | Date \| null | no | nullable | existente |
| `createdAt` | Date | sí | auto | existente |
| `updatedAt` | Date | sí | auto | existente |

#### UserRole (nuevo value object)

```typescript
export enum UserRole {
  ADMIN             = 'admin',
  SOC_ANALYST       = 'soc_analyst',
  INCIDENT_HANDLER  = 'incident_handler',
  INCIDENT_MANAGER  = 'incident_manager',
  CISO              = 'ciso',
}
```

---

### API Endpoints

#### POST /api/admin/users
- **Descripción:** Crea un nuevo usuario
- **Auth requerida:** sí — JWT con role=admin
- **Request Body:**
  ```json
  {
    "email":    "ana.torres@example.com",
    "fullName": "Ana Torres",
    "role":     "soc_analyst",
    "username": "ana.torres"
  }
  ```
- **Response 201:**
  ```json
  {
    "success": true,
    "user": {
      "id":       "uuid",
      "username": "ana.torres",
      "email":    "ana.torres@example.com",
      "fullName": "Ana Torres",
      "role":     "soc_analyst",
      "isActive": true,
      "createdAt": "2026-04-01T00:00:00.000Z"
    }
  }
  ```
- **Response 400:** campo faltante o rol inválido
- **Response 401:** token ausente o expirado
- **Response 403:** rol no es admin
- **Response 409:** `"El correo electrónico ya está en uso"`

---

#### GET /api/admin/users
- **Descripción:** Lista todos los usuarios
- **Auth requerida:** sí — JWT con role=admin
- **Response 200:**
  ```json
  {
    "users": [
      { "id": "uuid", "username": "...", "email": "...", "role": "...", "isActive": true, "fullName": "..." }
    ],
    "total": 5
  }
  ```
- **Response 401/403:** no autenticado / no es admin

---

#### GET /api/admin/users/:id
- **Descripción:** Obtiene el detalle de un usuario
- **Auth requerida:** sí — JWT con role=admin
- **Response 200:** objeto user completo
- **Response 404:** usuario no encontrado

---

#### PUT /api/admin/users/:id
- **Descripción:** Modifica nombre completo y/o rol
- **Auth requerida:** sí — JWT con role=admin
- **Request Body:** (campos opcionales)
  ```json
  { "fullName": "Ana Maria Torres", "role": "incident_handler" }
  ```
- **Response 200:**
  ```json
  {
    "success": true,
    "user": { "id": "uuid", "fullName": "Ana Maria Torres", "role": "incident_handler", "updatedAt": "..." },
    "audit": { "previousRole": "soc_analyst", "newRole": "incident_handler" }
  }
  ```
- **Response 400:** auto-cambio de rol / fullName vacío
- **Response 404:** usuario no encontrado

---

#### PATCH /api/admin/users/:id/status
- **Descripción:** Activa o desactiva la cuenta de un usuario
- **Auth requerida:** sí — JWT con role=admin
- **Request Body:**
  ```json
  { "isActive": false }
  ```
- **Response 200:**
  ```json
  {
    "success": true,
    "user": { "id": "uuid", "isActive": false },
    "reassignedIncidents": 2
  }
  ```
- **Response 400:** auto-desactivación
- **Response 404:** usuario no encontrado

---

### Diseño Frontend (Angular)

#### Componentes nuevos

| Componente | Archivo | Props / Inputs | Descripción |
|---|---|---|---|
| `UserManagementComponent` | `presentation/components/user-management/` | — | Página lista + tabla de usuarios |
| `UserFormComponent` | `presentation/components/user-management/user-form/` | `@Input user?`, `@Output saved` | Formulario crear/editar |
| `UserStatusToggleComponent` | `presentation/components/user-management/user-status/` | `@Input user`, `@Output toggled` | Toggle desactivar/reactivar con confirmación |

#### Rutas nuevas en `app.routes.ts`

```typescript
{
  path: 'admin/users',
  loadComponent: () => import('../presentation/components/user-management/user-management.component')
    .then(m => m.UserManagementComponent),
  canActivate: [authGuard, adminGuard]
}
```

#### Servicios (infraestructura Angular)

| Función | Archivo | Endpoint |
|---|---|---|
| `getUsers(token)` | `core/infrastructure/services/user-admin.service.ts` | `GET /api/admin/users` |
| `createUser(data, token)` | mismo | `POST /api/admin/users` |
| `updateUser(id, data, token)` | mismo | `PUT /api/admin/users/:id` |
| `toggleUserStatus(id, isActive, token)` | mismo | `PATCH /api/admin/users/:id/status` |

---

### Arquitectura y Dependencias

- Paquetes nuevos: ninguno
- Servicios externos: PostgreSQL (existente), Firebase JWT (existente para auth)
- Impacto en server.ts: ninguno — el router `/api/admin` ya está montado
- Impacto en ServiceFactory.ts: registrar los 3 nuevos use cases
- Impacto en app.routes.ts del frontend: agregar ruta `/admin/users`

### Notas de Implementación

> **ADR-002:** Roles ampliados de 3 a 5. El middleware `requireAdmin` ya existe y verifica `role === 'admin'`. No requiere cambios.
>
> **ADR-005:** Se usa `is_active` (nuevo campo) para la desactivación administrativa. El campo `is_locked` existente es exclusivo para blute-force y NO se toca en este módulo.
>
> **ADR-004:** Los nuevos use cases se registran en `ServiceFactory.ts` siguiendo el patrón de lazy instantiation ya establecido.
>
> La validación de que "un usuario no puede desactivar su propia cuenta" se implementa en el use case (no en el controller), para que esté cubierta por unit tests de dominio.

---

## 3. LISTA DE TAREAS

### Backend

#### Dominio
- [ ] Crear `domain/value-objects/UserRole.ts` — enum con 5 roles
- [ ] Ampliar `domain/ports/UserRepository.ts` — agregar `findByEmail()`, `findAllActive()`, `deactivate()`, `activate()`

#### Aplicación (Use Cases)
- [ ] Crear `application/use-cases/CreateUserUseCase.ts`
- [ ] Crear `application/use-cases/UpdateUserUseCase.ts`
- [ ] Crear `application/use-cases/ToggleUserStatusUseCase.ts`
- [ ] Crear `application/use-cases/ListUsersUseCase.ts`

#### Infraestructura
- [ ] Extender `infrastructure/persistence/PostgresUserRepository.ts` con nuevos métodos
- [ ] Crear migración `migrations/002_incidents_and_roles.sql` — columnas `full_name` e `is_active`
- [ ] Extender `infrastructure/http/controllers/admin.controller.ts` con 5 endpoints
- [ ] Crear `infrastructure/http/validators/user.schema.ts` — schemas Joi para create y update
- [ ] Registrar use cases en `infrastructure/factories/ServiceFactory.ts`

#### Tests Backend (Jest)
- [ ] `unit/domain/value-objects/UserRole.test.ts` — validación de enum
- [ ] `unit/application/use-cases/CreateUserUseCase.test.ts`
  - [ ] `test_create_user_success` — happy path
  - [ ] `test_create_user_duplicate_email_throws_conflict` — email en uso
  - [ ] `test_create_user_missing_fullname_throws_validation` — validación
  - [ ] `test_create_user_invalid_role_throws_validation` — rol inválido
- [ ] `unit/application/use-cases/UpdateUserUseCase.test.ts`
  - [ ] `test_update_user_name_success` — happy path nombre
  - [ ] `test_update_user_role_success_with_audit` — happy path rol + audit log
  - [ ] `test_update_user_self_role_change_throws` — auto-cambio
  - [ ] `test_update_user_not_found_throws` — 404
- [ ] `unit/application/use-cases/ToggleUserStatusUseCase.test.ts`
  - [ ] `test_deactivate_user_success_reassigns_incidents` — desactivar con incidentes
  - [ ] `test_deactivate_user_no_incidents_success` — desactivar sin incidentes
  - [ ] `test_reactivate_user_success` — reactivar
  - [ ] `test_deactivate_self_throws` — auto-desactivación

### Frontend (Angular)

#### Implementación
- [ ] Crear `core/infrastructure/services/user-admin.service.ts` — llamadas a API
- [ ] Crear `core/application/use-cases/GetUsersUseCase.ts` (opcional si se accede directo al service)
- [ ] Crear `presentation/components/user-management/user-management.component.ts` + template
- [ ] Crear `presentation/components/user-management/user-form/user-form.component.ts` + template
- [ ] Crear `presentation/components/user-management/user-status/user-status-toggle.component.ts`
- [ ] Registrar ruta `/admin/users` en `app/app.routes.ts` con `adminGuard`

#### Tests Frontend
- [ ] `UserManagementComponent` — renderiza tabla de usuarios
- [ ] `UserFormComponent` — valida campos obligatorios al submit
- [ ] `UserFormComponent` — muestra error si email ya existe (HTTP 409)
- [ ] `UserStatusToggleComponent` — emite evento al confirmar desactivación

### QA
- [ ] Generar escenarios Gherkin con `/gherkin-case-generator`
- [ ] Generar análisis de riesgos con `/risk-identifier`
- [ ] Actualizar AUTO_FRONT_POM con `UserManagementPage`
- [ ] Actualizar AUTO_FRONT_SCREENPLAY con Tasks: `CreateUser`, `UpdateUser`, `DeactivateUser`
- [ ] Actualizar AUTO_API_SCREENPLAY con colección `/api/admin/users`
- [ ] Actualizar estado spec: `status: IMPLEMENTED`
