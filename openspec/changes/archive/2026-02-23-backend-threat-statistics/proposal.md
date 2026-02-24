## Why

El backend del sistema CyberGuard almacena amenazas en PostgreSQL con campos `type`, `severity`, `status` y `created_at`, pero no expone ningún endpoint de agregación estadística. Los operadores deben leer cada amenaza individualmente para inferir el estado del sistema. Se requiere un endpoint `GET /api/statistics` que consolide métricas clave en una sola respuesta, guiado por TDD para cumplir el reto de la "Suite Inquebrantable" (cobertura ≥ 90%).

## What Changes

- **Nuevo port de dominio** `ThreatStatisticsRepository` — interfaz de solo lectura para estadísticas agregadas.
- **Nuevo use case** `GetThreatStatisticsUseCase` — orquesta la consulta al repositorio y devuelve el modelo `ThreatStatistics`.
- **Nuevo adaptador de infraestructura** `PostgresThreatStatisticsRepository` — implementa el port con 5 queries SQL de agregación ejecutadas en paralelo (`Promise.all`).
- **Nuevo controlador** `statistics.controller.ts` — monta `statisticsRouter` en `GET /` con `authMiddleware`.
- **Modificación de** `ServiceFactory.ts` — registra `getStatisticsUseCase()` como factory method nuevo (aditivo, sin romper existentes).
- **Modificación de** `server.ts` — monta `statisticsRouter` en `/api/statistics`.
- **Nuevo archivo** `TESTING_STRATEGY_BACKEND.md` — documenta la estrategia QA con distinción Verificar vs. Validar.

Sin cambios en endpoints existentes, sin mutaciones de estado — operación 100% de solo lectura.

## Capabilities

### New Capabilities

- `threat-statistics`: Endpoint `GET /api/statistics` que devuelve estadísticas agregadas de amenazas: total de amenazas, conteo por tipo, conteo por severidad, amenazas en las últimas 24 horas y amenazas críticas activas. Protegido por `authMiddleware`. Responde `{ success: true, data: ThreatStatistics }`.

### Modified Capabilities

<!-- Sin cambios a specs existentes — el port nuevo es totalmente aditivo. -->

## Impact

- **Código afectado:**
  - `backend/producer/src/domain/ports/` — nuevo archivo
  - `backend/producer/src/application/use-cases/` — nuevo archivo
  - `backend/producer/src/infrastructure/persistence/` — nuevo archivo
  - `backend/producer/src/infrastructure/http/controllers/` — nuevo archivo
  - `backend/producer/src/infrastructure/factories/ServiceFactory.ts` — método adicional
  - `backend/producer/src/server.ts` — nueva ruta montada
  - `backend/producer/src/__tests__/unit/application/use-cases/` — nuevos tests TDD
- **API nueva:** `GET /api/statistics` (requiere Bearer token)
- **Sin dependencias nuevas:** Usa `pg` (ya instalado) y Express (ya instalado)
- **Cobertura:** Domain 100%, Application 100%, cumple ≥ 90% global para la Suite Inquebrantable
