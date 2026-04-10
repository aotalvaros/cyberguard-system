# Mapa de Pruebas — CyberGuard System

> Documento de referencia rápida para ubicar todas las pruebas unitarias e integración de los 3 microservicios.

---

## Resumen General

| Microservicio | Runner | Unitarias | Integración | Total | Configs separadas |
|---|---|---|---|---|---|
| **Backend Producer** | Jest | 48 | 3 | 51 | `jest.config.js` + scripts `test:unit` / `test:integration` |
| **Backend Worker** | Jest | 11 | 3 | 14 | `jest.config.js` + scripts `test:unit` / `test:integration` |
| **Frontend** | Vitest | 28 | 29 | 57 | `vitest.unit.config.ts` / `vitest.integration.config.ts` |
| **TOTAL** | | **87** | **35** | **122** | |

---

## 1. Backend Producer

**Raíz de tests:** `backend/producer/src/__tests__/`
**Runner:** Jest (`ts-jest`)
**Scripts:**
```bash
npm run test           # todas las pruebas
npm run test:unit      # jest --testPathPattern=__tests__/unit
npm run test:integration  # jest --testPathPattern=__tests__/integration
```

### 1.1 Pruebas Unitarias (48 archivos)

#### Application Layer — Services (2)
| Archivo | Ruta |
|---------|------|
| `AuthService.test.ts` | `__tests__/unit/aplication/services/` |
| `threat.service.test.ts` | `__tests__/unit/aplication/services/` |

#### Application Layer — Use Cases (13)
| Archivo | Ruta |
|---------|------|
| `CreateIncidentUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |
| `CreateUserUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |
| `DeleteThreatUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |
| `GetAdminProfileUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |
| `GetNotificationPreferencesUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |
| `GetThreatStatisticsUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |
| `ListIncidentsUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |
| `ListThreatsUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |
| `ListUsersUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |
| `SaveNotificationPreferencesUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |
| `ToggleUserStatusUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |
| `UpdateAdminProfileUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |
| `UpdateUserUseCase.test.ts` | `__tests__/unit/aplication/use-cases/` |

#### Domain Layer — Entities (2)
| Archivo | Ruta |
|---------|------|
| `Incident.test.ts` | `__tests__/unit/domain/entities/` |
| `Threat.test.ts` | `__tests__/unit/domain/entities/` |

#### Domain Layer — Services (2)
| Archivo | Ruta |
|---------|------|
| `IncidentFactory.test.ts` | `__tests__/unit/domain/services/` |
| `ThreatClassifier.test.ts` | `__tests__/unit/domain/services/` |

#### Domain Layer — Value Objects (1)
| Archivo | Ruta |
|---------|------|
| `IncidentStatus.test.ts` | `__tests__/unit/domain/value-objects/` |

#### Infrastructure — Classification (1)
| Archivo | Ruta |
|---------|------|
| `ThreatClassificationStrategies.test.ts` | `__tests__/unit/infrastructure/classification/` |

#### Infrastructure — Config (5)
| Archivo | Ruta |
|---------|------|
| `database.test.ts` | `__tests__/unit/infrastructure/config/` |
| `env.test.ts` | `__tests__/unit/infrastructure/config/` |
| `logger.test.ts` | `__tests__/unit/infrastructure/config/` |
| `rabbitmq.test.ts` | `__tests__/unit/infrastructure/config/` |
| `redis.test.ts` | `__tests__/unit/infrastructure/config/` |

#### Infrastructure — Factories (1)
| Archivo | Ruta |
|---------|------|
| `ServiceFactory.test.ts` | `__tests__/unit/infrastructure/factories/` |

#### Infrastructure — Controllers (7)
| Archivo | Ruta |
|---------|------|
| `admin.controller.test.ts` | `__tests__/unit/infrastructure/http/controllers/` |
| `auth.controller.test.ts` | `__tests__/unit/infrastructure/http/controllers/` |
| `incident.controller.test.ts` | `__tests__/unit/infrastructure/http/controllers/` |
| `profile.controller.test.ts` | `__tests__/unit/infrastructure/http/controllers/` |
| `profile-notifications.controller.test.ts` | `__tests__/unit/infrastructure/http/controllers/` |
| `statistics.controller.test.ts` | `__tests__/unit/infrastructure/http/controllers/` |
| `threat.controller.test.ts` | `__tests__/unit/infrastructure/http/controllers/` |

#### Infrastructure — Middlewares (4)
| Archivo | Ruta |
|---------|------|
| `auth.middleware.test.ts` | `__tests__/unit/infrastructure/http/middlewares/` |
| `bruteforce.middleware.test.ts` | `__tests__/unit/infrastructure/http/middlewares/` |
| `error.middleware.test.ts` | `__tests__/unit/infrastructure/http/middlewares/` |
| `validation.middleware.test.ts` | `__tests__/unit/infrastructure/http/middlewares/` |

#### Infrastructure — Validators (1)
| Archivo | Ruta |
|---------|------|
| `threat.schema.test.ts` | `__tests__/unit/infrastructure/http/validators/` |

#### Infrastructure — Persistence (6)
| Archivo | Ruta |
|---------|------|
| `PostgresAuditLogRepository.test.ts` | `__tests__/unit/infrastructure/persistence/` |
| `PostgresIncidentRepository.test.ts` | `__tests__/unit/infrastructure/persistence/` |
| `PostgresThreatRepository.test.ts` | `__tests__/unit/infrastructure/persistence/` |
| `PostgresThreatStatisticsRepository.test.ts` | `__tests__/unit/infrastructure/persistence/` |
| `PostgresUserRepository.test.ts` | `__tests__/unit/infrastructure/persistence/` |
| `RedisNotificationPreferencesRepository.test.ts` | `__tests__/unit/infrastructure/persistence/` |

#### Infrastructure — Providers (3)
| Archivo | Ruta |
|---------|------|
| `FirebaseAuthProvider.test.ts` | `__tests__/unit/infrastructure/providers/` |
| `JWTTokenService.test.ts` | `__tests__/unit/infrastructure/providers/` |
| `RabbitMQPublisher.test.ts` | `__tests__/unit/infrastructure/providers/` |

### 1.2 Pruebas de Integración (3 archivos)

| Archivo | Ruta |
|---------|------|
| `auth.integration.test.ts` | `__tests__/integration/` |
| `profile.integration.test.ts` | `__tests__/integration/` |
| `statistics.integration.test.ts` | `__tests__/integration/` |

---

## 2. Backend Worker

**Raíz de tests:** `backend/worker/src/__tests__/`
**Runner:** Jest (`ts-jest`)
**Scripts:**
```bash
npm run test           # todas las pruebas
npm run test:unit      # jest --testPathPattern=__tests__/unit
npm run test:integration  # jest --testPathPattern=__tests__/integration
```

### 2.1 Pruebas Unitarias (11 archivos)

| Archivo | Qué prueba |
|---------|------------|
| `config.test.ts` | `infrastructure/config/index.ts` — variables de entorno |
| `logger.test.ts` | `infrastructure/logging/index.ts` — Winston logger |
| `handler.test.ts` | `domain/services/MessageHandler.ts` — sanitización de mensajes |
| `rabbitmq.test.ts` | `infrastructure/messaging/RabbitMQConsumer.ts` — consumo de mensajes |
| `redis.test.ts` | `infrastructure/persistence/RedisEventRepository.ts` — almacenamiento de eventos |
| `websocket.test.ts` | `infrastructure/websocket/WebSocketBroadcaster.ts` — broadcast WS |
| `email.adapter.test.ts` | `infrastructure/notifications/EmailAdapter.ts` — SendGrid adapter |
| `whatsapp.adapter.test.ts` | `infrastructure/notifications/WhatsAppAdapter.ts` — Twilio adapter |
| `notification.orchestrator.test.ts` | `infrastructure/notifications/NotificationOrchestrator.ts` — dispatch |
| `category-template.strategy.test.ts` | `infrastructure/notifications/CategoryTemplateStrategy.ts` — templates |
| `threat-event-processor.service.test.ts` | `application/services/ThreatEventProcessorService.ts` — procesamiento |

### 2.2 Pruebas de Integración (3 archivos)

| Archivo | Cadena bajo prueba |
|---------|--------------------|
| `process-threat-pipeline.integration.test.ts` | `ThreatEventProcessorService` → `MessageHandler` → `ProcessThreatEventUseCase` → save + broadcast + notify (10 tests) |
| `process-deleted-pipeline.integration.test.ts` | `ThreatEventProcessorService` → `MessageHandler` → `ProcessDeletedThreatUseCase` → remove + broadcast (11 tests) |
| `notification-pipeline.integration.test.ts` | `NotificationOrchestrator` + `LogNotificationAdapter` + `CategoryTemplateStrategy` reales (19 tests) |

---

## 3. Frontend

**Raíz de tests:** distribuidos junto al código en carpetas `__tests__/unit/` y `__tests__/integration/`
**Runner:** Vitest (`@analogjs/vite-plugin-angular`)
**Scripts:**
```bash
npm run test                # ng test (todas)
npm run test:unit           # vitest run --config vitest.unit.config.ts
npm run test:integration    # vitest run --config vitest.integration.config.ts
```
**Configs:**
- `vitest.config.ts` — todas las pruebas
- `vitest.unit.config.ts` — glob: `src/**/unit/**/*.spec.ts`
- `vitest.integration.config.ts` — glob: `src/**/integration/**/*.spec.ts`

### 3.1 Pruebas Unitarias (28 archivos)

#### Application — Use Cases (15)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `create-incident.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `create-user-admin.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `delete-threat.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `get-current-user.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `get-incidents.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `get-notification-preferences.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `get-statistics.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `get-threats.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `get-users.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `login.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `logout.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `report-threat.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `save-notification-preferences.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `toggle-user-status.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |
| `update-user-admin.use-case.spec.ts` | `core/application/use-cases/__tests__/unit/` |

#### Domain — Models (1)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `threat-statistics.model.spec.ts` | `core/domain/models/__tests__/unit/` |

#### Domain — Services (2)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `alerts-domain.service.spec.ts` | `core/domain/services/__tests__/unit/` |
| `threat-domain.service.spec.ts` | `core/domain/services/__tests__/unit/` |

#### Infrastructure — Handlers (1)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `global-error.handler.spec.ts` | `core/infrastructure/handlers/__tests__/unit/` |

#### Infrastructure — Mappers (3)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `auth.mapper.spec.ts` | `core/infrastructure/mappers/__tests__/unit/` |
| `threat.mapper.spec.ts` | `core/infrastructure/mappers/__tests__/unit/` |
| `websocket.mapper.spec.ts` | `core/infrastructure/mappers/__tests__/unit/` |

#### Infrastructure — Services (1)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `statistics-mock-repository.impl.spec.ts` | `core/infrastructure/services/__tests__/unit/` |

#### Infrastructure — State (1)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `loading.service.spec.ts` | `core/infrastructure/state/__tests__/unit/` |

#### Presentation — Components (2)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `report-threat.component.spec.ts` | `presentation/components/report-threat/__tests__/unit/` |
| `sidebar.component.spec.ts` | `presentation/components/sidebar/__tests__/unit/` |

#### Shared — Factories & Strategies (2)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `threat-validation.factory.spec.ts` | `shared/factories/__tests__/unit/` |
| `threat-validation.strategy.spec.ts` | `shared/strategies/__tests__/unit/` |

### 3.2 Pruebas de Integración (29 archivos)

#### App Root (1)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `app.spec.ts` | `app/__tests__/integration/` |

#### Domain — Ports (1)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `statistics.repository.spec.ts` | `core/domain/ports/__tests__/integration/` |

#### Infrastructure — Adapters (1)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `local-storage.adapter.spec.ts` | `core/infrastructure/adapters/__tests__/integration/` |

#### Infrastructure — Interceptors (4)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `auth.interceptor.spec.ts` | `core/infrastructure/interceptors/__tests__/integration/` |
| `error.interceptor.spec.ts` | `core/infrastructure/interceptors/__tests__/integration/` |
| `loading.interceptor.spec.ts` | `core/infrastructure/interceptors/__tests__/integration/` |
| `retry.interceptor.spec.ts` | `core/infrastructure/interceptors/__tests__/integration/` |

#### Infrastructure — Services (11)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `auth-repository.impl.spec.ts` | `core/infrastructure/services/__tests__/integration/` |
| `auth.service.full.spec.ts` | `core/infrastructure/services/__tests__/integration/` |
| `auth.service.spec.ts` | `core/infrastructure/services/__tests__/integration/` |
| `incident-repository.impl.spec.ts` | `core/infrastructure/services/__tests__/integration/` |
| `statistics-di.spec.ts` | `core/infrastructure/services/__tests__/integration/` |
| `statistics-repository.impl.spec.ts` | `core/infrastructure/services/__tests__/integration/` |
| `threat-repository.impl.spec.ts` | `core/infrastructure/services/__tests__/integration/` |
| `threat.service.spec.ts` | `core/infrastructure/services/__tests__/integration/` |
| `user-admin-repository.impl.spec.ts` | `core/infrastructure/services/__tests__/integration/` |
| `websocket-repository.impl.spec.ts` | `core/infrastructure/services/__tests__/integration/` |
| `websocket.service.spec.ts` | `core/infrastructure/services/__tests__/integration/` |

#### Presentation — Components (8)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `alerts.component.spec.ts` | `presentation/components/alerts/__tests__/integration/` |
| `alerts.integration.spec.ts` | `presentation/components/alerts/__tests__/integration/` |
| `dashboard.component.spec.ts` | `presentation/components/dashboard/__tests__/integration/` |
| `dashboard.integration.spec.ts` | `presentation/components/dashboard/__tests__/integration/` |
| `statistics-widget.component.spec.ts` | `presentation/components/dashboard/statistics-widget/__tests__/integration/` |
| `incident-list.component.spec.ts` | `presentation/components/incident-list/__tests__/integration/` |
| `notification-preferences.component.spec.ts` | `presentation/components/notification-preferences/__tests__/integration/` |
| `user-management.component.spec.ts` | `presentation/components/user-management/__tests__/integration/` |

#### Presentation — Guards (3)
| Archivo | Ruta relativa a `src/` |
|---------|------------------------|
| `admin.guard.spec.ts` | `presentation/guards/__tests__/integration/` |
| `auth.guard.spec.ts` | `presentation/guards/__tests__/integration/` |
| `no-auth.guard.spec.ts` | `presentation/guards/__tests__/integration/` |

---

## Convención de Ubicación

```
<módulo>/
  __tests__/
    unit/         ← pruebas unitarias (sin dependencias externas, mocks puros)
    integration/  ← pruebas de integración (Angular TestBed, DI real, HTTP mocks)
```

- **Backend**: Los 3 usan `src/__tests__/unit/` y `src/__tests__/integration/` con estructura que replica las capas hexagonales.
- **Frontend**: Cada módulo tiene su propia carpeta `__tests__/unit/` o `__tests__/integration/` co-locada junto al código fuente.
