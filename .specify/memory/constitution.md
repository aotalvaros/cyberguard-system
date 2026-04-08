# CyberGuard System — Constitution

> Documento normativo que define las reglas, estándares y principios obligatorios para todo artefacto generado dentro del proyecto CyberGuard. Toda spec, propuesta, diseño, tarea y código DEBE cumplir con esta constitución.

---

## 1. Arquitectura

### 1.1 Patrón General
- **Event-Driven Architecture** con microservicios comunicados vía RabbitMQ.
- Flujo: `Frontend → Backend API → RabbitMQ → Worker → WebSocket → Frontend`.

### 1.2 Arquitectura Hexagonal (obligatoria en Backend y Frontend)

Toda feature nueva DEBE respetar la separación en capas hexagonales:

| Capa | Backend (TypeScript) | Frontend (Angular 21) |
|------|---------------------|----------------------|
| **Domain** | Entidades, Value Objects, Ports (interfaces), Domain Services | Models, Enums, Ports (abstract classes), Domain Services |
| **Application** | Use Cases (`execute()`), Application Services | Use Cases (`execute()`), Facades |
| **Infrastructure** | Controllers, Repositories (Postgres), Providers (Firebase, JWT, RabbitMQ), Middlewares, Config | HTTP Adapters, WebSocket Adapters, Storage Adapters, Guards |
| **Presentation** | — | Components, Templates, Styles |

**Reglas:**
- El dominio NUNCA importa de infraestructura ni de presentación.
- Los use cases dependen SOLO de ports (interfaces/abstract classes), nunca de implementaciones concretas.
- La inyección de dependencias conecta ports con adaptadores en `ServiceFactory` (backend) o `app.config.ts` (frontend).

### 1.3 Stack Tecnológico

| Componente | Tecnología | Versión Mínima |
|------------|-----------|----------------|
| Frontend | Angular + Angular Material | 21+ |
| Backend (Producer) | Node.js + Express + TypeScript | Node 20+, Express 4 |
| Worker (Consumer) | Node.js + TypeScript | Node 20+ |
| Base de Datos | PostgreSQL | 15+ |
| Cache/Historial Worker | Redis | 7+ |
| Message Broker | RabbitMQ | 3.12+ |
| Autenticación | Firebase Auth + JWT (jsonwebtoken) | — |
| Validación | Joi | 17+ |
| Logging | Winston | 3+ |
| Testing Backend | Jest + Supertest | — |
| Testing Frontend | Vitest + jsdom | — |

---

## 2. Patrones de Diseño (obligatorios)

Todo código nuevo DEBE utilizar los patrones establecidos cuando aplique. No se permite lógica ad-hoc que duplique lo que un patrón existente ya resuelve.

### 2.1 Patrones Activos

| Patrón | Uso en Backend | Uso en Frontend |
|--------|---------------|-----------------|
| **Strategy** | `ThreatClassificationStrategy` — clasificación dinámica por tipo de amenaza. Añadir nuevo tipo = nueva clase strategy. | `ThreatValidationStrategy` — validación dinámica por tipo de amenaza en formularios. |
| **Factory** | `ServiceFactory` — lazy singleton de servicios, use cases y repositorios. `Threat.create()` — factory method para entidades. | `ThreatValidationFactory.createValidator(type)` — instancía la strategy correcta. |
| **Repository** | `ThreatRepository`, `UserRepository`, `AuditLogRepository`, `ThreatStatisticsRepository` → implementaciones `Postgres*`. | `AuthRepository`, `ThreatRepository`, `StatisticsRepository`, `WebSocketRepository` → adaptadores HTTP/WS. |
| **Observer** | RabbitMQ pub/sub vía `EventPublisher`. | `WebSocketRepositoryImpl` con `Subject` + `Observable` (RxJS). |
| **Facade** | — | `LoginFacade` — gestiona `loading$`, `error$`, `success$` para componentes. |
| **Use Case** | `GetThreatStatisticsUseCase`, `ListThreatsUseCase`, `DeleteThreatUseCase` — orquestadores de un solo `execute()`. | `LoginUseCase`, `LogoutUseCase`, `ReportThreatUseCase`, `GetStatisticsUseCase`, `GetThreatsUseCase`, `DeleteThreatUseCase`. |
| **Middleware Chain** | `helmet → cors → rateLimit → bruteForce → auth → errorHandler`. | Guards (`AuthGuard`, `AdminGuard`) como middleware de rutas. |

### 2.2 Reglas de Extensión
- **Nuevo tipo de amenaza:** crear nueva `*ClassificationStrategy` (backend) y nueva `*ValidationStrategy` (frontend). NO modificar clases existentes.
- **Nuevo endpoint:** crear Controller + UseCase + Port + Adapter. Registrar en `ServiceFactory` y `server.ts`.
- **Nuevo componente frontend:** crear Use Case + Port + Adapter HTTP + Component standalone. Registrar provider en `app.config.ts`.

---

## 3. Principios SOLID

Toda pieza de código DEBE cumplir los 5 principios. Se verifican en code review.

### 3.1 SRP — Single Responsibility
- Cada clase/función tiene UNA sola razón de cambio.
- Use cases: un solo método `execute()`.
- Controllers: solo orquestan request → use case → response.
- Domain entities: solo lógica de dominio (`isHighSeverity()`, `isCritical()`).

### 3.2 OCP — Open/Closed
- Abierto a extensión, cerrado a modificación.
- Nuevos tipos de amenaza = nueva strategy class, sin tocar `ThreatClassifier` ni `ThreatValidationFactory`.
- Nuevos endpoints = nuevos controllers/routers, sin modificar los existentes.

### 3.3 LSP — Liskov Substitution
- Toda implementación de un port es sustituible sin alterar el comportamiento del sistema.
- Tests de integración lo verifican: mocks implementan la misma interfaz que las clases reales.
- DI en `app.config.ts` y `ServiceFactory` permite swap transparente.

### 3.4 ISP — Interface Segregation
- Ports estrechos y cohesivos: `ThreatRepository` (CRUD), `ThreatStatisticsRepository` (solo stats), `EventPublisher` (solo publish), `TokenService` (solo generate/verify), `AuthProvider` (solo authenticate).
- Frontend: `AuthRepository`, `ThreatRepository`, `StatisticsRepository`, `WebSocketRepository` — cada uno con solo los métodos de su dominio.

### 3.5 DIP — Dependency Inversion
- Capas superiores dependen de abstracciones (ports), nunca de implementaciones.
- Backend: `GetThreatStatisticsUseCase` → `ThreatStatisticsRepository` (port), no `PostgresThreatStatisticsRepository`.
- Frontend: componentes inyectan use cases; use cases inyectan abstract repositories.

---

## 4. Clean Code

### 4.1 Type Safety
- **Cero `any`** en código de producción. TypeScript `strict: true` obligatorio.
- Configuración estricta del compilador: `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.
- Interfaces con `readonly` en campos de dominio. Entidades con constructor privado.

### 4.2 Nomenclatura
- **Clases**: PascalCase descriptivo — `GetThreatStatisticsUseCase`, `PostgresThreatRepository`, `MalwareValidationStrategy`.
- **Archivos**: kebab-case — `threat-statistics.model.ts`, `delete-threat.use-case.ts`.
- **Variables**: camelCase descriptivo — `currentUser`, `serializedPayload`, `threatClassifier`. Prohibido: nombres de una letra, abreviaciones crípticas.
- **Constantes**: UPPER_SNAKE_CASE — `HISTORY_CAPACITY`, `MAX_ATTEMPTS`, `EMPTY_STATISTICS`.

### 4.3 Funciones
- Máximo ~15 líneas por función.
- Un solo nivel de abstracción por función.
- Funciones delegadoras: `onSubmit()` → `validator.validate()` + `useCase.execute()`.

### 4.4 Error Handling
- **Backend**: `DomainError` (abstract) → excepciones específicas (`ThreatNotFoundException` con `code` + `details`). Middleware global `errorHandler` captura todo, retorna mensaje genérico al cliente, loguea internamente.
- **Frontend**: `catchError` en pipes de Observable. Facades gestionan `error$` como `BehaviorSubject`. Componentes muestran errores vía `*ngIf="facade.error$ | async as error"`.
- NUNCA exponer stack traces, queries SQL ni detalles internos al cliente.

### 4.5 Comentarios Centinela
- Mínimo 5 `// ⚠️ HUMAN CHECK:` por microservicio en lógica crítica:
  1. Configuración de conexiones (DB, RabbitMQ, Firebase).
  2. Lógica de reintentos y backoff.
  3. Validación y sanitización de inputs.
  4. Manejo de errores críticos.
  5. Generación y verificación de tokens JWT.

### 4.6 Inmutabilidad del Dominio
- Entidades con `private constructor` + `static create()` factory method.
- Campos `readonly` en interfaces de dominio y resultados de ports.
- `EMPTY_STATISTICS` como constante inmutable para defaults.

---

## 5. Testing

### 5.1 Cobertura Mínima Obligatoria

| Métrica | Umbral |
|---------|--------|
| Statements | ≥ 90% |
| Branches | ≥ 90% |
| Functions | ≥ 90% |
| Lines | ≥ 90% |

### 5.2 Metodología TDD
- Toda feature nueva DEBE seguir el ciclo **Red → Green → Refactor**.
- Commits separados por fase:
  - `test(RED): add [UseCase] unit tests before implementation`
  - `feat(GREEN): implement [UseCase] — all N tests pass`
  - `refactor(REFACTOR): [mejora específica]`
- Verificable en historial de git.

### 5.3 Organización de Tests

| Capa | Target | Mock Boundary |
|------|--------|---------------|
| Domain entities | 100% | Ninguno (POJO puro) |
| Application use cases | 100% | Typed mocks de ports |
| Infrastructure | ≥ 80% | `jest.mock` de DB / Firebase / RabbitMQ |
| Integration (Supertest) | Flujos completos | Solo `getPool()` mockeado |
| Frontend use cases | 100% | Mocks de abstract repositories |
| Frontend components | ≥ 80% | Mocks de use cases |

### 5.4 Convenciones de Tests
- **Patrón AAA**: Arrange → Act → Assert.
- **Nomenclatura**: describe `ClassName` → it `should [expected behavior] when [condition]`.
- **Mocks tipados**: implementan la interfaz del port (`implements ThreatStatisticsRepository`). TypeScript detecta drift en compile-time.
- **Distinción Verificar vs Validar**:
  - *Verificar*: tests de contrato arquitectónico (la clase existe, implementa el port, usa DI).
  - *Validar*: tests de invariantes de negocio (la estadística refleja los datos, el error se propaga).

### 5.5 Exclusiones Permitidas de Cobertura
- `*.d.ts` (definiciones de tipos)
- Archivos de test (`*.test.ts`, `*.spec.ts`)
- `server.ts` (bootstrap)
- Archivos de configuración puros (`jest.config.js`, `vitest.config.ts`)

---

## 6. Seguridad

### 6.1 Checklist Pre-Merge (obligatorio por PR)

| # | Dominio | Requisito |
|---|---------|-----------|
| 1 | **Secrets** | Cero credenciales hardcodeadas. `.env` en `.gitignore`. Variables validadas al inicio con `process.exit(1)` si faltan. |
| 2 | **Input Validation** | Todo endpoint valida inputs con Joi. Límites de tamaño definidos. Tipos verificados. |
| 3 | **SQL Injection** | Cero concatenación de strings en queries. Solo queries parametrizadas (`$1`, `$2`). |
| 4 | **XSS** | Sanitizar inputs antes de renderizar. CSP headers configurados vía Helmet. |
| 5 | **Auth & JWT** | Access token: HS256. Secret en variable de entorno. `authMiddleware` obligatorio en rutas protegidas. |
| 6 | **Error Handling** | Cero stack traces al cliente. Logear internamente. Mensajes genéricos al usuario. |
| 7 | **Rate Limiting** | 50 req / 15 min en `/api/`. Brute force: 5 intentos / 5 min en login. |
| 8 | **CORS** | Orígenes desde `ALLOWED_ORIGINS` env var. NUNCA `*`. |
| 9 | **Logging** | Cero passwords en logs. Datos sensibles enmascarados (`maskEmail()`). JSON estructurado. |
| 10 | **Passwords** | bcrypt con 10+ rounds. Nunca plaintext. Siempre `bcrypt.compare()`. |
| 11 | **RabbitMQ** | Credenciales desde env vars. Mensajes persistentes. Validar payload antes de publish. DLQ configurada. |
| 12 | **Auditoría** | Login attempts logueados. Brute force detectado y reportado como amenaza. CRUD de threats auditado. |
| 13 | **Dependencies** | `npm audit` sin critical/high. `package-lock.json` commiteado. |

### 6.2 Headers de Seguridad
- `helmet()` habilitado globalmente.
- CORS configurado con whitelist explícita.
- Body parser limitado a `10mb`.

---

## 7. Rendimiento

### 7.1 Límites Operacionales

| Métrica | Valor | Enforcement |
|---------|-------|-------------|
| Rate limit API | 50 req / 15 min por IP | `express-rate-limit` en `server.ts` |
| Brute force login | 5 intentos / 5 min, luego bloqueo + auto-reporte como threat | `bruteForceDetection` middleware |
| Request body max | 10 MB | `express.json({ limit: '10mb' })` |
| WebSocket reconnect | Backoff exponencial: `min(1000 × 2^attempts, 30000)`, máx 5 reintentos | `WebSocketRepositoryImpl` |
| Historial de alertas | Máximo 200 en Redis y localStorage | `HISTORY_CAPACITY = 200` |
| Alertas visibles | Máximo 50 en UI | `MAX_VISIBLE_MESSAGES = 50` |

### 7.2 Targets de Latencia

| Endpoint | Latencia p95 Target | Observado (stress test) |
|----------|--------------------|-----------------------|
| `POST /api/auth/login` | < 250ms | 180ms (50 concurrentes, 30s) |
| `POST /api/threats` | < 300ms | 240ms (30 concurrentes, 30s) |
| WebSocket delivery | < 50ms | — |

### 7.3 Targets de Frontend

| Métrica | Target |
|---------|--------|
| Lighthouse score | > 90 |
| Bundle size | < 500 KB |
| First Contentful Paint | < 1.5s |

### 7.4 Regla de No-Cache en Estadísticas
- `GET /api/statistics` DEBE computarse en tiempo real desde PostgreSQL.
- Prohibido cache entre endpoint y base de datos para esta ruta.

---

## 8. Experiencia de Usuario

### 8.1 Real-Time
- Alertas vía WebSocket con estado de conexión visible: `CONNECTED`, `DISCONNECTED`, `CONNECTING`, `ERROR`.
- Reconexión automática con backoff exponencial (transparente para el usuario).

### 8.2 Loading States
- Todo componente que dispare una operación async DEBE mostrar estado de carga.
- Patrón: `loading$` `BehaviorSubject` en Facade. Botón `[disabled]="loading$ | async"`.

### 8.3 Error Handling en UI
- Errores mostrados inline: `*ngIf="facade.error$ | async as error"`.
- Mensajes amigables, nunca detalles técnicos.
- Errores de validación por campo en formularios (Reactive Forms + validators).

### 8.4 Validación en Formularios
- Reactive Forms con validators síncronos.
- Validador custom `ipValidator` para IPv4.
- Validación dinámica vía Strategy Pattern según tipo de amenaza.

### 8.5 Funcionalidades de Dashboard Obligatorias
- Paginación de alertas (`currentPage`, `pageSize`).
- Búsqueda y filtrado por término, tipo y severidad.
- Exportación a JSON de alertas filtradas.
- Widget de estadísticas con totales, distribución por tipo y severidad.

### 8.6 Componentes
- Angular standalone components.
- `ChangeDetectorRef` para detección de cambios optimizada.
- Guards en rutas protegidas (`AuthGuard`, `AdminGuard`).

---

## 9. Convenciones de Commits y Git Flow

### 9.1 Formato: Conventional Commits

```
<type>(<scope>): <descripción>
```

| Tipo | Uso |
|------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Documentación |
| `test` | Tests |
| `refactor` | Refactorización sin cambio funcional |

### 9.2 TDD Commits
```
test(RED): add [UseCase] unit tests before implementation
feat(GREEN): implement [UseCase] — all N tests pass
refactor(REFACTOR): [descripción de mejora]
```

### 9.3 Branches

| Branch | Propósito | Ejemplo |
|--------|-----------|---------|
| `main` | Producción | — |
| `develop` | Integración general | — |
| `feature/<epic-id>/<feature-id>` | Rama padre de una feature Spec Kit | `feature/ep-01/admin-profile` |
| `feature/<epic-id>/<feature-id>/<task-id>` | Sub-rama por tarea del `tasks.md` | `feature/ep-01/admin-profile/task-01` |
| `fix/<feature-id>/<descripcion>` | Corrección dentro de una feature | `fix/admin-profile/email-validation` |
| `hotfix/<descripcion>` | Fix urgente en producción | `hotfix/jwt-expiration` |

### 9.4 Sub-ramas por Feature (Spec Kit)

Cada feature del backlog genera una **rama padre** y opcionalmente **sub-ramas por tarea**:

```
develop
└── feature/ep-01/admin-profile              ← rama padre de la feature
    ├── feature/ep-01/admin-profile/task-01  ← migración SQL
    ├── feature/ep-01/admin-profile/task-02  ← domain port
    ├── feature/ep-01/admin-profile/task-03  ← use case (RED)
    ├── feature/ep-01/admin-profile/task-04  ← use case (GREEN)
    └── ...
```

**Reglas:**
- La rama padre `feature/<epic-id>/<feature-id>` se crea desde `develop` al iniciar `/speckit.plan`.
- Cada sub-rama se crea desde la rama padre al iniciar una tarea del `tasks.md`.
- Las sub-ramas hacen merge a la **rama padre**, NUNCA directamente a `develop`.
- La rama padre hace merge a `develop` al completar **todos** los tasks (DoD cumplido).
- Naming: todo en kebab-case, sin espacios, sin mayúsculas.
- Tareas agrupables (ej. RED+GREEN del mismo use case) PUEDEN compartir una sub-rama.

### 9.5 Flujo Completo por Feature

```
1. git checkout develop
2. git checkout -b feature/ep-01/admin-profile          ← rama padre

   Por cada tarea (o grupo de tareas):
   3. git checkout -b feature/ep-01/admin-profile/task-01
   4. [código + tests]
   5. git commit -m "test(RED): ..."
   6. git commit -m "feat(GREEN): ..."
   7. git checkout feature/ep-01/admin-profile
   8. git merge --no-ff feature/ep-01/admin-profile/task-01
   9. git branch -d feature/ep-01/admin-profile/task-01

   Al completar todos los tasks:
   10. git checkout develop
   11. git merge --no-ff feature/ep-01/admin-profile     (via PR)
   12. git branch -d feature/ep-01/admin-profile
```

### 9.6 Regla de Merge
- Todo merge a `develop` requiere:
  1. PR con descripción detallada.
  2. Tests pasando (CI green).
  3. Cobertura ≥ 90%.
  4. Code review aprobado.
  5. Checklist de seguridad validado por QA.
  6. Documentación afectada actualizada en el mismo PR (§12).
  7. `docker-compose up --build -d` exitoso — todos los contenedores `Up`/`healthy` (§13).
---

## 10. Reglas para Artefactos Spec Kit

### 10.1 Specifications (spec.md)
- Formato BDD: `Given / When / Then` o `WHEN / THEN`.
- Usar `SHALL` / `MUST` para requisitos obligatorios.
- Cada requirement DEBE tener al menos un scenario verificable.
- Separar requirements de Frontend y Backend explícitamente.
- Definir en `.specify/specs/<feature-id>/spec.md`.

### 10.2 Plans (plan.md)
- DEBEN referenciar los patrones de diseño de esta constitución (§2).
- DEBEN especificar contracts de API (request/response con tipos exactos).
- DEBEN indicar qué ports se crean o extienden.
- DEBEN incluir la capa hexagonal afectada (Domain, Application, Infrastructure, Presentation).
- Definir en `.specify/specs/<feature-id>/plan.md`.

### 10.3 Tasks (tasks.md)
- Máximo 2 horas por tarea.
- Cada tarea debe ser verificable con un test o evidencia concreta.
- Incluir la capa hexagonal afectada.
- Respetar el orden TDD: test tasks antes de implementation tasks.
- Tareas paralelas marcadas con `[P]`.
- Definir en `.specify/specs/<feature-id>/tasks.md`.

### 10.4 Constitution Updates
- Cambios a esta constitución requieren justificación documentada.
- Se actualiza cuando se adopta un nuevo patrón, tecnología o se modifica un threshold de calidad.

---

## 12. Documentos como Artefactos Vivos

### 12.1 Principio
Toda la documentación del proyecto es un **artefacto vivo**: refleja el estado real y actual del sistema, no un estado histórico o aspiracional. Un documento desactualizado es técnicamente deuda.

### 12.2 Regla de Actualización Obligatoria
Cada vez que se realice un cambio en el código, la arquitectura o los procesos, **los documentos afectados DEBEN actualizarse en el mismo PR / commit que introduce el cambio**. Actualizar documentación después del hecho no es aceptable.

### 12.3 Documentos que SIEMPRE deben mantenerse sincronizados

| Documento | Se actualiza cuando... |
|---|---|
| `.specify/memory/constitution.md` | Se adopta un nuevo patrón, regla o threshold |
| `.specify/specs/<feature>/tasks.md` | Se completan o modifican tareas |
| `.specify/specs/<feature>/spec.md` | Cambia el alcance, requisitos o contratos de la feature |
| `.specify/specs/<feature>/plan.md` | Cambia la estrategia de implementación |
| `README.md` | Cambia la estructura del proyecto, pasos de instalación o uso |
| `docs/project/PROJECT_CONTEXT.md` | Cambia el contexto arquitectural o de negocio |
| `AI_WORKFLOW.md` | Cambia el proceso de trabajo con IA |

### 12.4 Anti-pattern Prohibido
> **NEVER** entregar un PR con código nuevo sin actualizar la documentación relevante. El reviewer puede (y debe) rechazar PRs donde el código diverge de la documentación.

### 12.5 Verificación
En el checklist de PR (§9.4) se añade un punto obligatorio:
- `[ ]` Los documentos afectados por este cambio han sido actualizados en este mismo PR.

---

## 11. Regla de Completitud: Ningún Cambio se Marca como Terminado sin Tests Verdes

### 11.1 Definición de "Terminado"
Un task, step, feature o PR **NUNCA** puede marcarse como completado (`✅`, `[x]`, estado `done`) hasta que:

1. **Todos los tests del proyecto pasen sin errores** — sin excepción.
2. Las suites de verificación relevantes se hayan ejecutado explícitamente **después** del último cambio de código.
3. No se haya introducido ninguna regresión respecto al baseline anterior.

### 11.2 Comandos de Verificación Obligatorios

| Capa | Comando | Resultado esperado |
|------|---------|-------------------|
| Frontend | `npx vitest run` (en `frontend/cyberguard-system-appv2/`) | `X passed (N)` — cero failures |
| Backend producer | `npm test` (en `backend/producer/`) | `X passed` — cero failures |
| Worker | `npm test` (en `backend/worker/`) | `X passed` — cero failures |
| Despliegue completo | `docker-compose up --build -d` (en raíz) | todos los servicios `Up`/`healthy` (§13) |

### 11.3 Anti-pattern Prohibido
> **NEVER** marcar un task como `✅` o `completed` si el comando de verificación muestra `X failed` o si no fue ejecutado tras el último cambio.

### 11.4 Protocolo ante Regresión
Si un cambio introduce una regresión (tests que antes pasaban ahora fallan):
1. El cambio **no puede mergearse** hasta resolver la regresión.
2. Se debe crear una rama `fix/*` para corregir los tests rotos.
3. Solo tras confirmar suite GREEN se puede marcar la tarea como terminada y proceder con el merge.

### 11.5 Justificación
Esta regla nació tras el incidente de EP-03 (external-notifications) donde la adición de `NotificationPreferencesComponent` a `DashboardComponent` rompió los tests del dashboard y decenas de otros archivos quedaron en rojo por falta de `TestBed.initTestEnvironment` / `resetTestingModule`. El costo de corrección fue significativamente mayor que el de haber verificado antes de marcar como terminado.

---

## 13. Regla de Verificación de Despliegue Docker

### 13.1 Principio
Todo cambio de código que modifique contratos de tipos, interfaces de dominio, o la estructura del modelo debe verificarse con un build de Docker completo antes de marcarse como terminado. El sistema DEBE poder desplegarse en cualquier momento.

### 13.2 Regla
Todo PR / merge que toque cualquiera de estos artefactos DEBE pasar exitosamente `docker-compose up --build -d` antes de mergearse:

| Artefacto modificado | Riesgo de rotura Docker |
|---|---|
| Interfaces de dominio / ports (`UserRecord`, `ProfileUpdateData`, etc.) | Alto — el compilador de Docker usa `strict: true` |
| Modelos de dominio del frontend (`User`, entidades) | Alto — Angular compiler en build de producción |
| Mappers (`auth.mapper.ts`, etc.) | Alto — type mismatches aparecen solo en build prod |
| `ServiceFactory.ts` | Medio — imports nuevos pueden fallar |
| `app.config.ts` | Medio — providers nuevos pueden romper DI |

### 13.3 Comando de Verificación Obligatorio
```bash
# Desde la raíz del repositorio
docker-compose up --build -d && docker-compose ps
# Resultado esperado: todos los servicios en estado "Up" o "healthy"
```

### 13.4 Anti-pattern Prohibido
> **NEVER** marcar una feature como completada basándose solo en `tsc --noEmit` local o en los tests de vitest/jest. El compilador de Angular en modo producción (`ng build --configuration production`) es más estricto que el compilador de desarrollo.

### 13.5 Protocolo ante Fallo de Build Docker
1. El contenedor que falla indica qué servicio tiene errores de compilación.
2. Corregir en la misma rama — nunca mergear código que no compila en Docker.
3. Verificar con `docker-compose build <servicio>` antes del `up` completo.

### 13.6 Justificación
Esta regla nació tras el incidente del merge EP-01+EP-03 en `epic/sprint-01/features` donde:
- `AuthService.ts` no incluía `phone: null` requerido por `UserRecord` (EP-01 añadió el campo)
- `profile.component.ts` asignaba propiedades `readonly` de `ProfileUpdateData` una a una
- `auth.mapper.ts` devolvía `role: string` donde el modelo exigía `UserRole`
  
Todos estos errores son silenciosos en desarrollo pero rompen el build de producción.

---

---

## 14. Regla de Integración Aditiva en Merges

### 14.1 Principio
Al hacer merge de `develop` hacia una rama de integración (ej. `epic/*`), o de cualquier rama con trabajo de otro desarrollador, la resolución de conflictos DEBE ser **aditiva**: toda funcionalidad de ambas ramas coexiste en el resultado. Nunca se elige entre una u otra — se integran.

> Lema: **"resolve conflicts by keeping both, not by choosing one".**

### 14.2 Checklist de Resolución de Conflictos Obligatorio

Antes de marcar un merge como terminado, verificar que en el resultado final estén presentes **todas** las contribuciones de ambas ramas:

| Artefacto | Qué verificar |
|---|---|
| `ServiceFactory.ts` | Todos los use cases e instancias de ambas ramas están registrados |
| `app.config.ts` (frontend) | Todos los providers de ambas ramas están declarados |
| `app.routes.ts` (frontend) | Todas las rutas de ambas ramas están definidas |
| `server.ts` (backend) | Todos los `app.use(...)` de ambas ramas están presentes |
| Imports en archivos conflictuados | Ningún import necesario fue eliminado al resolver |
| Tests nuevos del compañero | Sus specs corren y pasan sin modificar su lógica de negocio |

### 14.3 Anti-patterns Prohibidos

| Anti-pattern | Descripción |
|---|---|
| **Clobber merge** | Elegir la versión de un branch entero descartando la del otro (`git checkout --theirs` o `--ours` en bloques grandes) |
| **Silent drop** | Resolver un conflicto eliminando las líneas de uno de los branches sin análisis (ej. borrar imports, providers o rutas del compañero) |
| **Lazy accept** | Aceptar automáticamente todos los cambios "incoming" o "current" sin leer qué se pierde |
| **Test blindness** | No ejecutar la suite completa tras el merge para verificar que ambas partes funcionan |

### 14.4 Protocolo de Resolución Paso a Paso

```
1. git merge --no-ff <rama> — nunca --strategy=ours
2. Para CADA archivo en conflicto:
   a. Leer ambos bloques (<<<<< HEAD y >>>>>>> branch)
   b. Identificar qué agrega cada bloque
   c. Construir el resultado que contiene AMBOS aportes
   d. Verificar que no se perdió ningún import, provider, ruta o use case
3. Ejecutar suite completa tras la resolución:
   - frontend: npx vitest run (≥ X passed, 0 failed)
   - backend producer: npm test (≥ X passed, 0 failed)
   - worker: npm test (≥ X passed, 0 failed)
4. Ejecutar docker-compose up --build -d (todos los servicios Up/healthy)
5. Solo entonces: git commit del merge
```

### 14.5 Verificación Post-Merge

Después de resolver el merge, confirmar explícitamente:

- [ ] Todos los use cases de EP-01, EP-02, EP-03 siguen funcionando.
- [ ] Todos los use cases y componentes del compañero siguen funcionando.
- [ ] No hay imports eliminados ni providers faltantes.
- [ ] Suite de tests 100% verde en las 3 capas.
- [ ] Docker: 6/6 servicios healthy.

### 14.6 Justificación

Esta regla nació tras el merge de `develop` (PR #54 — IRMS: user management + incidents + sidebar) hacia `epic/sprint-01/features` (EP-01 admin profile + EP-02/EP-03 notifications). Los 10 conflictos en `ServiceFactory.ts`, `app.config.ts`, `app.routes.ts`, `server.ts`, `UserRepository.ts` y otros requerían integración cuidadosa de ambos conjuntos de funcionalidades. La resolución incorrecta hubiera dejado features enteras de alguno de los desarrolladores silenciosamente eliminadas.

---

---

## §15. Estilo de Documentación y Código — Sin Emojis

### 15.1 Principio
Todo artefacto generado por agentes de IA o desarrolladores — documentación, código fuente, comentarios, specs, commits y mensajes de log — DEBE estar libre de caracteres emoji.

### 15.2 Alcance
- Archivos `.md` (specs, requirements, README, constitución, docs)
- Archivos de código fuente (`.ts`, `.html`, `.css`, `.js`, `.json`)
- Comentarios de código (`// ...`, `/** ... */`, `<!-- ... -->`)
- Mensajes de commit
- Strings visibles al usuario en templates
- Asuntos y cuerpos de notificaciones externas (email, WhatsApp)

### 15.3 Anti-patterns prohibidos

| Prohibido | Alternativa aceptada |
|-----------|---------------------|
| `// ⚠️ HUMAN CHECK:` | `// HUMAN CHECK:` |
| `// ✅ Obtener instancia` | `// Obtener instancia` |
| `<h1>CyberGuard Dashboard</h1>` con emoji | `<h1>CyberGuard Dashboard</h1>` |
| `subject: '🚨 CyberGuard: Malware'` | `subject: '[MALWARE] CyberGuard: Malware'` |
| `{ icon: '🛡️' }` en navItems | `{ icon: 'D' }` (inicial o abreviatura) |
| `✅ {{ successMessage() }}` en template | `{{ successMessage() }}` |

### 15.4 Justificación
Los emojis introducen dependencias de codificación (UTF-8 BOM, variantes de sistema operativo), dificultan el grep y la búsqueda en logs, y generan inconsistencias en terminales con codificación limitada. La documentación técnica debe ser clara, portable y procesable por herramientas de CI/CD sin conversiones especiales.

---

## §16. Código Sin Comentarios

### 16.1 Principio
El código fuente de producción NO debe contener comentarios de ningún tipo. El código debe ser autoexplicativo mediante nombres descriptivos de variables, funciones, clases y parámetros.

### 16.2 Alcance
Aplica a todos los archivos de producción:
- `.ts`, `.js`, `.html` en `backend/` y `frontend/`
- Excluye archivos de test (`*.spec.ts`, `__tests__/`)
- Excluye archivos de configuración de herramientas (`.eslintrc`, `jest.config.js`, etc.)

### 16.3 Tipos de comentarios prohibidos

| Tipo | Ejemplo prohibido |
|------|------------------|
| Comentario de línea | `// Obtener instancia del repositorio` |
| Comentario HUMAN CHECK | `// HUMAN CHECK: verificar esto` |
| Bloque JSDoc | `/** @param username El usuario */` |
| Bloque multilínea | `/* lógica de negocio */` |
| Comentario HTML | `<!-- sección de filtros -->` |
| Anotación TODO/FIXME | `// TODO: refactorizar` |

### 16.4 Cómo expresar la intención sin comentarios

| En vez de comentar... | Hacer esto |
|----------------------|------------|
| `// valida email` antes de un if | Extraer en función `isValidEmail()` |
| `// repositorio de usuarios` sobre una variable | Nombrar la variable `userRepository` |
| `// solo admin puede acceder` | Encapsular en `adminGuard` o `requireAdminRole()` |
| `// HUMAN CHECK: campo sensible` | Documentar en la spec o en el README del módulo |

### 16.5 Justificación
Los comentarios se desactualizan con el código y crean ruido. En un proyecto con specs técnicas aprobadas en `.github/specs/`, con nombres descriptivos y arquitectura hexagonal bien definida, el código debe leerse como prosa sin necesidad de anotaciones adicionales.

---

Esta constitución es **normativa** y aplica a todo artefacto desde su fecha de creación. Se actualiza cuando:
- Se adopta un nuevo patrón o tecnología.
- Se modifica un threshold de calidad.
- Se descubre un anti-pattern recurrente.

**Última actualización:** 07 de abril de 2026 — §11 Completitud, §12 Docs Vivos, §13 Docker Deploy, §14 Integración Aditiva en Merges, §15 Sin Emojis, §16 Código Sin Comentarios
