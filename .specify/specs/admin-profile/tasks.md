# Tasks: Admin Profile Management
**Feature ID:** `admin-profile`
**Plan:** `.specify/specs/admin-profile/plan.md`
**Versión:** 1.0.0
**Fecha:** 06 Abr 2026

> **Convención:**
> - `[ ]` tarea pendiente · `[x]` completada
> - `[P]` puede ejecutarse en paralelo con otras marcadas `[P]` del mismo grupo
> - Estimación máxima: 2h por tarea (per §10.3 constitución)
> - Orden TDD obligatorio: test RED → implementación GREEN → refactor

---

## FASE 1 — Backend: Domain & Application

### TASK-01 · Migración SQL
**Capa:** Infrastructure · **Estimación:** 30 min

- [ ] Crear `backend/producer/migrations/002_add_phone_to_users.sql`
- [ ] Añadir `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;`
- [ ] Verificar que la migración es idempotente (`IF NOT EXISTS`)
- [ ] Aplicar localmente y confirmar que `\d users` muestra la columna

**Verificación:** `SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='phone'` retorna 1 fila.

---

### TASK-02 · Extender Port `UserRepository` + tipo `ProfileUpdateData`
**Capa:** Domain · **Estimación:** 30 min

- [ ] Añadir en `backend/producer/src/domain/ports/UserRepository.ts`:
  ```typescript
  export interface ProfileUpdateData {
    readonly username?: string;
    readonly email?:    string;
    readonly phone?:    string | null;
  }
  ```
- [ ] Añadir métodos al interface `UserRepository`:
  ```typescript
  findByEmail(email: string): Promise<UserRecord | null>;
  updateProfile(id: string, data: ProfileUpdateData): Promise<UserRecord>;
  ```
- [ ] Confirmar que TypeScript reporta error en `PostgresUserRepository` por métodos no implementados (compile-time check)

**Verificación:** `npx tsc --noEmit` falla con "Property 'findByEmail' is missing" — esperado en este punto.

---

### TASK-03 · [RED] Tests de `GetAdminProfileUseCase`
**Capa:** Application · **Estimación:** 45 min

- [ ] Crear `backend/producer/src/__tests__/unit/application/GetAdminProfileUseCase.test.ts`
- [ ] Describir: `GetAdminProfileUseCase`
  - [ ] `should return AdminProfileResult when user exists`
  - [ ] `should throw ProfileNotFoundException when user does not exist`
  - [ ] `should not include passwordHash, isLocked or failedAttempts in result`
  - [ ] `should call userRepository.findById with the given userId`
- [ ] Mock tipado: `const mockUserRepo: jest.Mocked<UserRepository>`
- [ ] Confirmar que todos los tests fallan (RED) — el use case no existe aún

**Verificación:** `npx jest GetAdminProfileUseCase --no-coverage` → 4 tests FAIL.

---

### TASK-04 · [GREEN] Implementar `GetAdminProfileUseCase`
**Capa:** Application · **Estimación:** 45 min

- [ ] Crear `backend/producer/src/application/use-cases/GetAdminProfileUseCase.ts`
- [ ] Constructor: `constructor(private readonly userRepository: UserRepository)`
- [ ] `execute({ userId }): Promise<AdminProfileResult>`
  - [ ] Llamar `userRepository.findById(userId)`
  - [ ] Si no existe → lanzar `ProfileNotFoundException`
  - [ ] Retornar `{ username, email, role, phone, createdAt }` — sin `passwordHash`, `isLocked`, `failedAttempts`
- [ ] Crear `backend/producer/src/domain/errors/ProfileNotFoundException.ts` extendiendo `DomainError`
- [ ] Confirmar que los 4 tests de TASK-03 pasan (GREEN)

**Verificación:** `npx jest GetAdminProfileUseCase --no-coverage` → 4 tests PASS.

---

### TASK-05 · [RED] Tests de `UpdateAdminProfileUseCase`
**Capa:** Application · **Estimación:** 45 min

- [ ] Crear `backend/producer/src/__tests__/unit/application/UpdateAdminProfileUseCase.test.ts`
- [ ] Describir: `UpdateAdminProfileUseCase`
  - [ ] `should update profile and return updated AdminProfileResult`
  - [ ] `should register audit log entry on successful update`
  - [ ] `should throw EmailAlreadyExistsException when email is taken`
  - [ ] `should throw RoleModificationNotAllowedException when role is included in data`
  - [ ] `should throw ProfileNotFoundException when user does not exist`
- [ ] Mocks tipados: `UserRepository`, `AuditLogRepository`
- [ ] Confirmar que todos los tests fallan (RED)

**Verificación:** `npx jest UpdateAdminProfileUseCase --no-coverage` → 5 tests FAIL.

---

### TASK-06 · [GREEN] Implementar `UpdateAdminProfileUseCase`
**Capa:** Application · **Estimación:** 1h

- [ ] Crear `backend/producer/src/application/use-cases/UpdateAdminProfileUseCase.ts`
- [ ] Constructor: `constructor(private readonly userRepository: UserRepository, private readonly auditLogRepository: AuditLogRepository)`
- [ ] `execute({ userId, data }): Promise<AdminProfileResult>`
  - [ ] Verificar que `data` no contiene `role` → lanzar `RoleModificationNotAllowedException`
  - [ ] Buscar usuario → lanzar `ProfileNotFoundException` si no existe
  - [ ] Si `data.email` → verificar con `findByEmail()` → lanzar `EmailAlreadyExistsException` si existe y no es el mismo usuario
  - [ ] Llamar `userRepository.updateProfile(userId, data)`
  - [ ] Registrar en `auditLogRepository`: `{ action: 'PROFILE_UPDATED', userId, changes: Object.keys(data) }`
  - [ ] Retornar `AdminProfileResult`
- [ ] Crear `EmailAlreadyExistsException`, `RoleModificationNotAllowedException` en `domain/errors/`
- [ ] Confirmar que los 5 tests de TASK-05 pasan (GREEN)

**Verificación:** `npx jest UpdateAdminProfileUseCase --no-coverage` → 5 tests PASS.

---

## FASE 2 — Backend: Infrastructure

### TASK-07 · Extender `PostgresUserRepository` + tests
**Capa:** Infrastructure · **Estimación:** 1h

- [ ] Implementar `findByEmail()` en `PostgresUserRepository`:
  ```sql
  SELECT * FROM users WHERE email = $1
  ```
- [ ] Implementar `updateProfile()` en `PostgresUserRepository`:
  ```sql
  UPDATE users SET
    username   = COALESCE($2, username),
    email      = COALESCE($3, email),
    phone      = COALESCE($4, phone),
    updated_at = NOW()
  WHERE id = $1 RETURNING *
  ```
- [ ] Extender `PostgresUserRepository.test.ts` con los nuevos métodos:
  - [ ] `findByEmail() should return user when email exists`
  - [ ] `findByEmail() should return null when not found`
  - [ ] `updateProfile() should update and return updated UserRecord`
  - [ ] `updateProfile() should throw when no row returned`
- [ ] Confirmar que `npx tsc --noEmit` pasa sin errores

**Verificación:** `npx jest PostgresUserRepository --no-coverage` → todos los tests PASS.

---

### TASK-08 · Joi Schema `updateProfileSchema` [P]
**Capa:** Infrastructure · **Estimación:** 30 min

- [ ] Crear `backend/producer/src/infrastructure/validation/updateProfileSchema.ts`
- [ ] Definir schema con Joi:
  - `username`: `string().min(3).max(50).optional()`
  - `email`: `string().email().optional()`
  - `phone`: `string().pattern(/^\+[1-9]\d{6,14}$/).optional().allow(null)`
  - `.min(1)` — al menos un campo requerido
  - Sin campo `role` (excluido explícitamente)
- [ ] Añadir `// ⚠️ HUMAN CHECK: role excluido del schema — no puede modificarse via este endpoint`

**Verificación:** Test manual en REPL — schema rechaza `{ role: 'admin' }` y acepta `{ phone: '+573001234567' }`.

---

### TASK-09 · `profile.controller.ts` [P]
**Capa:** Infrastructure · **Estimación:** 1h

- [ ] Crear `backend/producer/src/infrastructure/http/controllers/profile.controller.ts`
- [ ] `GET /` → `authMiddleware` → `GetAdminProfileUseCase.execute({ userId: req.user.id })`
  - [ ] `200` con `AdminProfileResponse`
  - [ ] `404` si `ProfileNotFoundException`
  - [ ] `401` delegado al `authMiddleware`
- [ ] `PATCH /` → `authMiddleware` → validar con `updateProfileSchema` → `UpdateAdminProfileUseCase.execute()`
  - [ ] `200` con perfil actualizado
  - [ ] `400` si Joi falla o `RoleModificationNotAllowedException`
  - [ ] `409` si `EmailAlreadyExistsException`
  - [ ] `401` delegado al `authMiddleware`
- [ ] Cero stack traces en respuestas (per §4.4)
- [ ] Añadir `// ⚠️ HUMAN CHECK: authMiddleware verifica Firebase JWT en cada request`

**Verificación:** Test manual con `curl` o Thunder Client — `GET` retorna `200` con perfil.

---

### TASK-10 · Registrar en `ServiceFactory` y `server.ts`
**Capa:** Infrastructure · **Estimación:** 30 min

- [ ] Añadir en `ServiceFactory`:
  ```typescript
  static getGetAdminProfileUseCase(): GetAdminProfileUseCase { ... }
  static getUpdateAdminProfileUseCase(): UpdateAdminProfileUseCase { ... }
  ```
- [ ] Registrar router en `server.ts`:
  ```typescript
  import profileRouter from './infrastructure/http/controllers/profile.controller';
  app.use('/api/admin', profileRouter);
  ```
- [ ] Confirmar que no hay conflicto con las rutas `GET /api/admin/users` y `PATCH /api/admin/users/:username/role` existentes

**Verificación:** `npx tsc --noEmit` pasa. Servidor arranca sin errores.

---

### TASK-11 · Tests de integración Supertest
**Capa:** Infrastructure · **Estimación:** 1h

- [ ] Crear `backend/producer/src/__tests__/integration/profile.controller.test.ts`
- [ ] Mockear `getPool()` (patrón existente en el proyecto)
- [ ] Cubrir los escenarios del spec:
  - [ ] `GET /api/admin/profile` con token válido → `200` + perfil
  - [ ] `GET /api/admin/profile` sin token → `401`
  - [ ] `PATCH /api/admin/profile` con datos válidos → `200` + perfil actualizado
  - [ ] `PATCH /api/admin/profile` con email inválido → `400`
  - [ ] `PATCH /api/admin/profile` con `role` en body → `400`
  - [ ] `PATCH /api/admin/profile` con email duplicado → `409`

**Verificación:** `npx jest profile.controller --no-coverage` → todos los tests PASS.

---

## FASE 3 — Frontend: Domain & Application

### TASK-12 · Extender model `User` + crear `AdminProfileModel` [P]
**Capa:** Domain · **Estimación:** 30 min

- [ ] Extender `frontend/.../core/domain/models/user.model.ts`:
  ```typescript
  export interface User {
    readonly username:  string;
    readonly email:     string;      // añadir
    readonly role:      UserRole;
    readonly phone:     string | null; // añadir
    readonly createdAt?: string;       // añadir
  }
  ```
- [ ] Crear `frontend/.../core/domain/models/admin-profile.model.ts`:
  ```typescript
  export interface AdminProfile { username, email, role, phone, createdAt }
  export interface ProfileUpdateData { username?, email?, phone? }
  ```
- [ ] Confirmar que el compilador Angular no reporta errores en los usos actuales de `User`

**Verificación:** `ng build --dry-run` (o `npx tsc --noEmit`) pasa sin errores.

---

### TASK-13 · Port `AdminProfileRepository` (abstract class) [P]
**Capa:** Domain · **Estimación:** 20 min

- [ ] Crear `frontend/.../core/domain/ports/admin-profile.repository.ts`:
  ```typescript
  export abstract class AdminProfileRepository {
    abstract getProfile(): Observable<AdminProfile>;
    abstract updateProfile(data: ProfileUpdateData): Observable<AdminProfile>;
  }
  ```
- [ ] Añadir `// ⚠️ HUMAN CHECK: Puerto de salida — implementado por AdminProfileHttpAdapter`

**Verificación:** Archivo compila sin errores.

---

### TASK-14 · [RED] Tests de use cases Frontend
**Capa:** Application · **Estimación:** 45 min

- [ ] Crear `frontend/.../core/application/use-cases/get-admin-profile.use-case.spec.ts`
  - [ ] `should call repository.getProfile() and return AdminProfile`
  - [ ] `should propagate errors from repository`
- [ ] Crear `frontend/.../core/application/use-cases/update-admin-profile.use-case.spec.ts`
  - [ ] `should call repository.updateProfile() with correct data`
  - [ ] `should return updated AdminProfile on success`
  - [ ] `should propagate 409 error from repository`
- [ ] Mocks: implementan `AdminProfileRepository` abstract class

**Verificación:** `npx vitest run` → 5 tests FAIL (clases no existen aún).

---

### TASK-15 · [GREEN] Implementar use cases Frontend
**Capa:** Application · **Estimación:** 45 min

- [ ] Crear `frontend/.../core/application/use-cases/get-admin-profile.use-case.ts`
  ```typescript
  execute(): Observable<AdminProfile> {
    return this.adminProfileRepository.getProfile();
  }
  ```
- [ ] Crear `frontend/.../core/application/use-cases/update-admin-profile.use-case.ts`
  ```typescript
  execute(data: ProfileUpdateData): Observable<AdminProfile> {
    return this.adminProfileRepository.updateProfile(data);
  }
  ```
- [ ] Confirmar que los 5 tests de TASK-14 pasan (GREEN)

**Verificación:** `npx vitest run` → 5 tests PASS.

---

### TASK-16 · `AdminProfileFacade`
**Capa:** Application · **Estimación:** 1h

- [ ] Crear `frontend/.../core/application/facades/admin-profile.facade.ts`
- [ ] Exponer: `profile$`, `loading$`, `error$` como `BehaviorSubject`
- [ ] `loadProfile()`: activa `loading$`, llama use case, actualiza `profile$` o `error$`
- [ ] `updateProfile(data)`: activa `loading$`, llama use case, actualiza `profile$` o `error$`
- [ ] Usar `catchError` en pipes — nunca exponer errores técnicos (per §4.4)
- [ ] Crear `frontend/.../core/application/facades/admin-profile.facade.spec.ts`:
  - [ ] `should set loading$ to true while fetching profile`
  - [ ] `should populate profile$ on success`
  - [ ] `should set error$ on failure`

**Verificación:** `npx vitest run` → tests de facade PASS.

---

## FASE 4 — Frontend: Infrastructure & Presentation

### TASK-17 · `AdminProfileHttpAdapter`
**Capa:** Infrastructure · **Estimación:** 45 min

- [ ] Crear `frontend/.../core/infrastructure/adapters/admin-profile-http.adapter.ts`
- [ ] `getProfile()`: `GET /api/admin/profile` con `Authorization: Bearer <token>`
- [ ] `updateProfile(data)`: `PATCH /api/admin/profile` con `Authorization: Bearer <token>`
- [ ] Token obtenido de `AuthRepository.getToken()` (per §6.1 #5)
- [ ] Añadir `// ⚠️ HUMAN CHECK: token inyectado desde AuthRepository — no hardcodeado`
- [ ] Mapper: `AdminProfileHttpAdapter` → `AdminProfile` (sin campos sensibles)

**Verificación:** Test unitario con `HttpClientTestingModule` — `getProfile()` realiza `GET /api/admin/profile`.

---

### TASK-18 · `ProfileFormComponent` (standalone) [P]
**Capa:** Presentation · **Estimación:** 1h 30 min

- [ ] Crear `frontend/.../presentation/profile/profile-form.component.ts`
- [ ] Reactive Form con campos: `username`, `email`, `phone`, `role`
- [ ] Campo `role`: `FormControl({ disabled: true })` — nunca editable (R-FE-03)
- [ ] Validator `email`: `Validators.email`
- [ ] Validator `phone`: custom `phoneE164Validator` — patrón `/^\+[1-9]\d{6,14}$/`
- [ ] `@Input() profile: AdminProfile` — pre-carga el formulario con `patchValue()`
- [ ] `@Input() loading$: Observable<boolean>` — deshabilita botón
- [ ] `@Input() error$: Observable<string | null>` — muestra error inline
- [ ] `@Output() save = new EventEmitter<ProfileUpdateData>()` — emite solo campos modificados
- [ ] Botón "Guardar cambios": `[disabled]="form.invalid || form.pristine || (loading$ | async)"`
- [ ] Crear `profile-form.component.spec.ts`:
  - [ ] `should disable role field on init`
  - [ ] `should emit save with only changed fields`
  - [ ] `should show email validation error when format is invalid`
  - [ ] `should disable save button when form is pristine`

**Verificación:** `npx vitest run` → 4 tests PASS.

---

### TASK-19 · `ProfileComponent` (standalone) [P]
**Capa:** Presentation · **Estimación:** 1h

- [ ] Crear `frontend/.../presentation/profile/profile.component.ts`
- [ ] Inyectar `AdminProfileFacade`
- [ ] `ngOnInit()`: llamar `facade.loadProfile()`
- [ ] Template:
  - [ ] Spinner/skeleton mientras `loading$ | async`
  - [ ] `<app-profile-form>` con bindings a `profile$`, `loading$`, `error$`
  - [ ] Snackbar `MatSnackBar`: "Perfil actualizado correctamente" en éxito
  - [ ] Snackbar con mensaje genérico en error (nunca mensaje técnico)
- [ ] `onSave(data: ProfileUpdateData)`: delega a `facade.updateProfile(data)`
- [ ] Crear `profile.component.spec.ts`:
  - [ ] `should call facade.loadProfile() on init`
  - [ ] `should show snackbar on successful save`
  - [ ] `should show error snackbar on failed save`

**Verificación:** `npx vitest run` → 3 tests PASS.

---

### TASK-20 · Ruta `/profile` + providers en `app.config.ts`
**Capa:** Infrastructure · **Estimación:** 30 min

- [ ] Añadir ruta en `app.routes.ts`:
  ```typescript
  {
    path: 'profile',
    loadComponent: () => import('./presentation/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [AuthGuard]
  }
  ```
- [ ] Añadir providers en `app.config.ts`:
  ```typescript
  { provide: AdminProfileRepository, useClass: AdminProfileHttpAdapter },
  AdminProfileFacade,
  GetAdminProfileUseCase,
  UpdateAdminProfileUseCase,
  ```
- [ ] Añadir enlace "Perfil Personal" en el menú de navegación existente

**Verificación:** La app arranca, navegar a `/profile` carga el componente sin errores en consola.

---

## FASE 5 — Validación Final

### TASK-21 · Cobertura y commit TDD
**Estimación:** 30 min

- [ ] Ejecutar `npx jest --coverage` (backend) → verificar ≥ 90% en use cases y controller
- [ ] Ejecutar `npx vitest run --coverage` (frontend) → verificar ≥ 90% en use cases, facade y componentes
- [ ] Hacer commit por fases (per §9.2 constitución):
  ```
  test(RED):    add GetAdminProfileUseCase + UpdateAdminProfileUseCase tests
  feat(GREEN):  implement admin profile use cases and controller
  refactor:     extract ProfileUpdateData type to domain port
  ```

---

### TASK-22 · Checklist de seguridad pre-merge (per §6.1)

- [ ] `phone` no aparece en logs (verificar con `grep -r "phone" *.log`)
- [ ] `role` no modificable desde `PATCH /api/admin/profile` (test de integración cubre esto)
- [ ] Queries parametrizadas — sin concatenación de strings (`$1`, `$2`)
- [ ] `authMiddleware` activo en ambas rutas del controller
- [ ] Ninguna respuesta contiene `passwordHash`, `isLocked`, `failedAttempts`
- [ ] `npm audit` sin critical/high en backend y frontend
- [ ] PR creado con descripción + referencia a `spec.md`

---

## Resumen de Tareas

| Task | Fase | Capa | Tipo | Est. | Deps |
|------|------|------|------|------|------|
| TASK-01 | BE | Infrastructure | impl | 30 min | — |
| TASK-02 | BE | Domain | impl | 30 min | TASK-01 |
| TASK-03 | BE | Application | test RED | 45 min | TASK-02 |
| TASK-04 | BE | Application | impl GREEN | 45 min | TASK-03 |
| TASK-05 | BE | Application | test RED | 45 min | TASK-02 |
| TASK-06 | BE | Application | impl GREEN | 1h | TASK-05 |
| TASK-07 | BE | Infrastructure | impl+test | 1h | TASK-02, TASK-04, TASK-06 |
| TASK-08 | BE | Infrastructure | impl [P] | 30 min | — |
| TASK-09 | BE | Infrastructure | impl [P] | 1h | TASK-04, TASK-06, TASK-08 |
| TASK-10 | BE | Infrastructure | registro | 30 min | TASK-07, TASK-09 |
| TASK-11 | BE | Infrastructure | test integración | 1h | TASK-10 |
| TASK-12 | FE | Domain | impl [P] | 30 min | — |
| TASK-13 | FE | Domain | impl [P] | 20 min | TASK-12 |
| TASK-14 | FE | Application | test RED | 45 min | TASK-13 |
| TASK-15 | FE | Application | impl GREEN | 45 min | TASK-14 |
| TASK-16 | FE | Application | impl | 1h | TASK-15 |
| TASK-17 | FE | Infrastructure | impl | 45 min | TASK-13 |
| TASK-18 | FE | Presentation | impl [P] | 1h 30 min | TASK-16 |
| TASK-19 | FE | Presentation | impl [P] | 1h | TASK-16 |
| TASK-20 | FE | Infrastructure | registro | 30 min | TASK-17, TASK-18, TASK-19 |
| TASK-21 | — | — | validación | 30 min | TASK-20 |
| TASK-22 | — | — | seguridad | 30 min | TASK-21 |

**Total estimado:** ~14h · **Paralelizable a ~10h** con las tareas `[P]`
