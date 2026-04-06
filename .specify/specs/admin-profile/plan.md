# Plan: Admin Profile Management
**Feature ID:** `admin-profile`
**Spec:** `.specify/specs/admin-profile/spec.md`
**Versión:** 1.0.0
**Fecha:** 06 Abr 2026
**Estado:** `ready`

---

## 1. Análisis del Estado Actual

### 1.1 Lo que YA existe (no tocar)
| Artefacto | Ruta | Relevancia |
|-----------|------|-----------|
| `UserRecord` / `UserRepository` (port) | `backend/producer/src/domain/ports/UserRepository.ts` | Se extiende con `phone` y `findByEmail()` |
| `PostgresUserRepository` | `backend/producer/src/infrastructure/persistence/PostgresUserRepository.ts` | Se extiende con `updateProfile()` |
| `admin.controller.ts` | `backend/producer/src/infrastructure/http/controllers/admin.controller.ts` | Se añade el router de perfil aquí o en archivo nuevo |
| `ServiceFactory` | `backend/producer/src/infrastructure/factories/ServiceFactory.ts` | Se registran los nuevos use cases |
| `AuditLogRepository` (port) | `backend/producer/src/domain/ports/AuditLogRepository.ts` | Se reutiliza para auditar cambios de perfil |
| `AuthRepository` (FE abstract) | `frontend/.../core/domain/ports/auth.repository.ts` | Se crea port análogo para perfil |
| `User` model (FE) | `frontend/.../core/domain/models/user.model.ts` | Se extiende con `phone` y `email` |
| `app.config.ts` (FE) | `frontend/.../src/app.config.ts` | Registrar providers nuevos |

### 1.2 Lo que FALTA (crear)
- Campo `phone` en tabla `users` (migración SQL)
- Métodos `findByEmail()` y `updateProfile()` en `UserRepository` port + impl
- `GetAdminProfileUseCase` y `UpdateAdminProfileUseCase` (BE)
- `profile.controller.ts` con las rutas `GET/PATCH /api/admin/profile`
- `AdminProfileModel` + `IAdminProfileRepository` (FE domain)
- `GetAdminProfileUseCase` + `UpdateAdminProfileUseCase` + `AdminProfileFacade` (FE application)
- `AdminProfileHttpAdapter` (FE infrastructure)
- `ProfileComponent` + `ProfileFormComponent` (FE presentation)
- Ruta `/profile` en el router de Angular

---

## 2. Decisiones de Diseño

### 2.1 Reusar `UserRepository`, NO crear `AdminProfileRepository`
**Razón:** El aggregate ya existe en el dominio como `UserRecord`. Crear un segundo repository para el mismo aggregate violaría §3.4 ISP y generaría duplicación de lógica de persistencia. En su lugar:
- Se añaden dos métodos al port existente: `findByEmail()` y `updateProfile()`
- `updateProfile()` recibe `ProfileUpdateData` (sin `role`, sin `isLocked`, sin `failedAttempts`) para garantizar ISP y OCP

### 2.2 Dos Use Cases separados (SRP §3.1)
- `GetAdminProfileUseCase` → consulta, solo lectura
- `UpdateAdminProfileUseCase` → mutación + auditoría
Ninguno conoce el otro. Cada uno tiene un único `execute()`.

### 2.3 `AdminProfileFacade` en Frontend (Facade §2.1)
Patrón igual a `LoginFacade`. Expone `profile$`, `loading$`, `error$` como `BehaviorSubject`. El componente solo se suscribe, nunca llama directamente al use case.

### 2.4 Migración SQL aditiva (no destructiva)
Solo se añade la columna `phone` con `ALTER TABLE`. El resto de la tabla no se modifica.

---

## 3. Diseño Backend

### 3.1 Migración SQL

**Archivo:** `backend/producer/migrations/002_add_phone_to_users.sql`

```sql
-- ⚠️ HUMAN CHECK: verificar que la migración se aplique en el orden correcto
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;
```

### 3.2 Extensión del Port `UserRepository`

**Archivo:** `backend/producer/src/domain/ports/UserRepository.ts`

```typescript
// Nuevo tipo para actualización de perfil (sin campos de seguridad)
export interface ProfileUpdateData {
  readonly username?: string;
  readonly email?:    string;
  readonly phone?:    string | null;
}

// Métodos a añadir en UserRepository interface
findByEmail(email: string): Promise<UserRecord | null>;
updateProfile(id: string, data: ProfileUpdateData): Promise<UserRecord>;
```

> **OCP §3.2:** Se añaden métodos al port sin modificar los existentes.
> **ISP §3.4:** `ProfileUpdateData` excluye `role`, `isLocked`, `failedAttempts` por diseño.

### 3.3 Extensión de `PostgresUserRepository`

**Archivo:** `backend/producer/src/infrastructure/persistence/PostgresUserRepository.ts`

```typescript
async findByEmail(email: string): Promise<UserRecord | null> {
  // SELECT * FROM users WHERE email = $1
}

async updateProfile(id: string, data: ProfileUpdateData): Promise<UserRecord> {
  // UPDATE users SET
  //   username = COALESCE($2, username),
  //   email    = COALESCE($3, email),
  //   phone    = COALESCE($4, phone),
  //   updated_at = NOW()
  // WHERE id = $1 RETURNING *
  // ⚠️ HUMAN CHECK: queries parametrizadas — sin concatenación de strings (§6.1 #3)
}
```

### 3.4 Use Cases

**`GetAdminProfileUseCase`**
- Archivo: `backend/producer/src/application/use-cases/GetAdminProfileUseCase.ts`
- Puerto entrada: `{ userId: string }`
- Puerto salida: `AdminProfileResult` (sin `passwordHash`, sin `isLocked`, sin `failedAttempts`)
- Dependencia: `UserRepository` (port, inyectado)
- Lanza: `ProfileNotFoundException` si el usuario no existe

**`UpdateAdminProfileUseCase`**
- Archivo: `backend/producer/src/application/use-cases/UpdateAdminProfileUseCase.ts`
- Puerto entrada: `{ userId: string, data: ProfileUpdateData }`
- Puerto salida: `AdminProfileResult`
- Dependencias: `UserRepository`, `AuditLogRepository` (ports, inyectados)
- Lanza: `RoleModificationNotAllowedException` si el body incluye `role`
- Lanza: `EmailAlreadyExistsException` si el nuevo email está en uso
- Registra en `audit_logs`: `{ action: 'PROFILE_UPDATED', userId, changes: [...] }`

### 3.5 Joi Schema

**Archivo:** `backend/producer/src/infrastructure/validation/updateProfileSchema.ts`

```typescript
const updateProfileSchema = Joi.object({
  username: Joi.string().min(3).max(50).optional(),
  email:    Joi.string().email().optional(),
  phone:    Joi.string().pattern(/^\+[1-9]\d{6,14}$/).optional().allow(null),
  // ⚠️ HUMAN CHECK: el campo role está explícitamente excluido del schema (§R-BE-04)
}).min(1); // al menos un campo
```

### 3.6 Controller

**Archivo:** `backend/producer/src/infrastructure/http/controllers/profile.controller.ts`

```
GET  /api/admin/profile   → authMiddleware → GetAdminProfileUseCase
PATCH /api/admin/profile  → authMiddleware → updateProfileSchema (Joi) → UpdateAdminProfileUseCase
```

> Registrar en `server.ts`: `app.use('/api/admin', profileRouter)`

### 3.7 Registro en `ServiceFactory`

```typescript
static getGetAdminProfileUseCase(): GetAdminProfileUseCase { ... }
static getUpdateAdminProfileUseCase(): UpdateAdminProfileUseCase { ... }
```

---

## 4. Diseño Frontend

### 4.1 Extensión del Model `User`

**Archivo:** `frontend/.../core/domain/models/user.model.ts`

```typescript
export interface User {
  readonly username: string;
  readonly email:    string;   // añadir
  readonly role:     UserRole;
  readonly phone:    string | null;  // añadir
  readonly createdAt?: string;       // añadir
}
```

### 4.2 Port (Abstract Class)

**Archivo:** `frontend/.../core/domain/ports/admin-profile.repository.ts`

```typescript
export abstract class AdminProfileRepository {
  abstract getProfile(): Observable<AdminProfile>;
  abstract updateProfile(data: ProfileUpdateData): Observable<AdminProfile>;
}
```

### 4.3 Use Cases

**`GetAdminProfileUseCase`**
- Archivo: `frontend/.../core/application/use-cases/get-admin-profile.use-case.ts`
- Inyecta: `AdminProfileRepository` (abstract)
- Retorna: `Observable<AdminProfile>`

**`UpdateAdminProfileUseCase`**
- Archivo: `frontend/.../core/application/use-cases/update-admin-profile.use-case.ts`
- Inyecta: `AdminProfileRepository` (abstract)
- Retorna: `Observable<AdminProfile>`

### 4.4 Facade

**Archivo:** `frontend/.../core/application/facades/admin-profile.facade.ts`

```typescript
export class AdminProfileFacade {
  readonly profile$  = new BehaviorSubject<AdminProfile | null>(null);
  readonly loading$  = new BehaviorSubject<boolean>(false);
  readonly error$    = new BehaviorSubject<string | null>(null);

  loadProfile(): void { ... }
  updateProfile(data: ProfileUpdateData): void { ... }
}
```

> Patrón Facade §2.1 — igual a `LoginFacade`. El componente solo se suscribe.

### 4.5 HTTP Adapter

**Archivo:** `frontend/.../core/infrastructure/adapters/admin-profile-http.adapter.ts`

```typescript
// GET  /api/admin/profile  → mapea a AdminProfile
// PATCH /api/admin/profile → mapea a AdminProfile
// Incluye Authorization: Bearer <token> en cada request
// ⚠️ HUMAN CHECK: token obtenido de AuthRepository.getToken() (§6.1 #5)
```

### 4.6 Componentes (Standalone, per §8.6)

**`ProfileComponent`** — `frontend/.../presentation/profile/profile.component.ts`
- Ruta: `/profile`
- Guard: `AuthGuard`
- Inyecta: `AdminProfileFacade`
- Responsabilidad: orquestar carga y mostrar estado

**`ProfileFormComponent`** — `frontend/.../presentation/profile/profile-form.component.ts`
- Inputs: `@Input() profile`, `@Input() loading$`, `@Input() error$`
- Output: `@Output() save` emite `ProfileUpdateData`
- Reactive Form con validators: `email`, `phone` (E.164 custom validator)
- Campo `role`: `[disabled]="true"` (R-FE-03)
- Botón "Guardar": `[disabled]="form.invalid || form.pristine || (loading$ | async)"`

### 4.7 Ruta Angular

```typescript
// app.routes.ts — añadir:
{
  path: 'profile',
  loadComponent: () => import('./presentation/profile/profile.component'),
  canActivate: [AuthGuard]
}
```

### 4.8 Providers en `app.config.ts`

```typescript
{ provide: AdminProfileRepository, useClass: AdminProfileHttpAdapter },
AdminProfileFacade,
GetAdminProfileUseCase,
UpdateAdminProfileUseCase,
```

---

## 5. Contratos de API (tipados)

### GET /api/admin/profile → `200 OK`
```typescript
interface AdminProfileResponse {
  username:  string;
  email:     string;
  role:      'admin' | 'analyst' | 'viewer';
  phone:     string | null;
  createdAt: string; // ISO8601
}
```

### PATCH /api/admin/profile → `200 OK`
```typescript
interface UpdateProfileRequest {
  username?: string;  // min 3, max 50
  email?:    string;  // formato email
  phone?:    string | null;  // E.164 o null
}
// Response: AdminProfileResponse (mismo shape)
```

### Errores
```typescript
// 400 — campo inválido o intento de modificar role
{ error: 'VALIDATION_ERROR' | 'ROLE_MODIFICATION_NOT_ALLOWED', details?: string }
// 401 — token inválido
{ error: 'UNAUTHORIZED' }
// 409 — email duplicado
{ error: 'EMAIL_ALREADY_EXISTS' }
```

---

## 6. Orden de Implementación (TDD)

```
Fase 1 — Backend Domain & Application
  1. Migración SQL (002_add_phone_to_users.sql)
  2. Extender UserRecord + UserRepository port
  3. [RED]   Tests de GetAdminProfileUseCase
  4. [GREEN] Implementar GetAdminProfileUseCase
  5. [RED]   Tests de UpdateAdminProfileUseCase
  6. [GREEN] Implementar UpdateAdminProfileUseCase

Fase 2 — Backend Infrastructure
  7. Extender PostgresUserRepository (findByEmail, updateProfile)
  8. updateProfileSchema (Joi)
  9. profile.controller.ts
 10. Registrar en ServiceFactory + server.ts
 11. Tests de integración (Supertest)

Fase 3 — Frontend Domain & Application
 12. Extender User model
 13. AdminProfileRepository (abstract class)
 14. [RED]   Tests de GetAdminProfileUseCase (FE)
 15. [GREEN] Implementar GetAdminProfileUseCase (FE)
 16. [RED]   Tests de UpdateAdminProfileUseCase (FE)
 17. [GREEN] Implementar UpdateAdminProfileUseCase (FE)
 18. AdminProfileFacade

Fase 4 — Frontend Infrastructure & Presentation
 19. AdminProfileHttpAdapter
 20. ProfileFormComponent
 21. ProfileComponent
 22. Ruta /profile + providers en app.config.ts
 23. Tests de componentes
```

---

## 7. Checklist Pre-Implementación (per §6.1 constitución)

- [ ] Migración SQL revisada (no destructiva)
- [ ] `phone` en `.gitignore` si se loguea — verificar que `maskEmail()` siga vigente
- [ ] `role` excluido del Joi schema y del `ProfileUpdateData`
- [ ] Queries con `$1`, `$2` — sin concatenación
- [ ] `authMiddleware` en ambas rutas
- [ ] Token obtenido de `AuthRepository.getToken()` en el adapter FE
- [ ] Cobertura ≥ 90% en use cases y controller antes del merge
